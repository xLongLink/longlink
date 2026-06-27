from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from kubernetes.client.rest import ApiException
from src.auth import authuser, authadmin, organization_access
from src.errors import ConflictError, NotFoundError, UnavailableError
from src.logger import logger
from src.constants import APP_SERVICE_PORT
from src.utils.utils import slugify, metadata, knames
from src.utils.namespace import k8name
from src.adapters.database import Postgres
from src.models.operations import OperationKind
from src.models.common import SuccessResponse
from src.models.applications import (ApplicationStatus, ApplicationCreate,
                                         ApplicationResponse)
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.operations import operations
from src.database.services.applications import applications

HOP_BY_HOP_HEADERS = {
    "connection",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}

router = APIRouter()


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(user: User = Depends(authadmin)) -> list[ApplicationResponse]:
    """Return all applications for administrator views."""

    return await applications.list_all_responses(user)


@router.post("/api/applications", response_model=ApplicationResponse)
async def create_application(organization_id: UUID, payload: ApplicationCreate, user: User = Depends(authuser)) -> ApplicationResponse:
    """Register a new application in the database and deploy it on the compute cluster."""

    organization_record = await organization_access(organization_id, user)

    application_slug = slugify(payload.name)
    logger.info("Provisioning application %s/%s", organization_record.slug, application_slug)

    # Capture image build labels when the SDK image was built with them.
    image_metadata = metadata(payload.image)

    registries = await compute.list()
    if not registries:
        raise UnavailableError("No compute cluster configured")

    database_registries = await database.list()
    if not database_registries:
        raise UnavailableError("No database configured")

    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{organization_record.location_id}'")

    database_registry = next((registry for registry in database_registries if registry.location_id == organization_record.location_id), None)
    if database_registry is None:
        raise UnavailableError(f"No database configured for location '{organization_record.location_id}'")

    # Create the application row before provisioning external resources.
    try:
        application = await applications.create(
            organization_id,
            payload.name,
            application_slug,
            image=payload.image,
            version=image_metadata.version if image_metadata is not None else None,
            sdk_version=image_metadata.sdk if image_metadata is not None else None,
            status=ApplicationStatus.creating,
            description=payload.description,
            icon=payload.icon,
            user=user,
        )
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    db_client = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
    )

    # Provision the namespace, schema, and workload in order so failures can mark the application as failed.
    try:
        await k8s.namespace(organization_record.slug)
        await db_client.schema(organization_record.slug, application_slug)
        await k8s.application(organization_record.slug, application_slug, payload.image, APP_SERVICE_PORT, payload.envs)
    except HTTPException:
        await applications.set_status(application.id, ApplicationStatus.failed)
        raise
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        raise UnavailableError("Failed to initialize the application") from exc

    try:
        operation = await operations.create(OperationKind.application_create, application_id=application.id, step="verify", user=user)
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        logger.exception("Failed to queue application verification for %s/%s", organization_record.slug, payload.name)
        raise UnavailableError("Failed to queue application verification") from exc

    logger.info("Queued application creation verification %s for %s/%s", operation.id, organization_record.slug, payload.name)

    return application


@router.delete("/api/applications/{application_id}", response_model=SuccessResponse)
async def delete_application(application_id: UUID, user: User = Depends(authadmin)) -> SuccessResponse:
    """Queue application deletion and return immediately."""

    # Load the application first so missing rows fail before we delete it.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    await applications.set_status(application.id, ApplicationStatus.deleting)
    try:
        await operations.create(OperationKind.application_delete, application_id=application.id, step="remove_runtime", user=user)
    except Exception as exc:
        await applications.set_status(application.id, application.status)
        logger.exception("Failed to queue application deletion for %s", application.name)
        raise UnavailableError("Failed to queue application deletion") from exc

    return SuccessResponse()


@router.get("/api/applications/{application_id}/logs")
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed application."""

    # Validate the application and organization before connecting to the active cluster.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    organization_record = await organization_access(application.organization_id, user)

    registries = await compute.list()
    if not registries:
        raise UnavailableError("No compute cluster configured")

    # Prefer the newest registry for the location so logs come from the active cluster.
    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{organization_record.location_id}'")

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await k8s.logs(organization_record.slug, application.slug)
    except ValueError as exc:
        raise UnavailableError(str(exc)) from exc

    return Response(content=logs, media_type="text/plain")


@router.api_route(
    "/api/applications/{application_id}/proxy/{path:path}",
    methods=["DELETE", "GET", "PATCH", "POST"],
)
async def proxy_application_request(
    application_id: UUID,
    request: Request,
    path: str = "",
    user: User = Depends(authuser),
) -> Response:
    """Proxy one request into the deployed application service."""

    # Load the application and organization from the path-scoped identifier.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    organization = await organization_access(application.organization_id, user)

    if application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    registries = await compute.list()
    if not registries:
        raise UnavailableError("No compute cluster configured")

    # Prefer the newest registry for the location so the live cluster stays in sync.
    registry = max(
        (registry for registry in registries if registry.location_id == organization.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{organization.location_id}'")

    upstream_path = path.lstrip("/")
    if upstream_path == "":
        raise NotFoundError("Proxy root path", "/")

    namespace = k8name(knames(organization.slug, "Organization"))
    name = knames(application.slug, "Application name")
    # Strip hop-by-hop headers before forwarding the request upstream.
    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "authorization"
    }
    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    resource_path = f"/api/v1/namespaces/{namespace}/services/{name}/proxy"
    if upstream_path != "":
        resource_path = f"{resource_path}/{upstream_path}"

    # Forward the request body and response stream directly through the Kubernetes API client.
    try:
        upstream_response = k8s._api_client.call_api(
            resource_path,
            request.method,
            query_params=list(request.query_params.multi_items()),
            header_params=forward_headers,
            body=await request.body(),
            auth_settings=["BearerToken"],
            _preload_content=False,
            _return_http_data_only=False,
        )
    except ApiException as exc:
        if exc.status == 503:
            return Response(status_code=503, headers={"cache-control": "no-store"})
        raise

    body, status_code, upstream_headers = upstream_response

    # Filter hop-by-hop response headers so FastAPI can return a clean proxied response.
    return Response(
        content=body.data,
        status_code=status_code,
        headers={
            key: value
            for key, value in upstream_headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length"
        },
    )
