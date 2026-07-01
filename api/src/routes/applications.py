from uuid import UUID
from typing import Any, cast
from fastapi import Depends, Request, Response, APIRouter
from src.auth import authuser, authadmin, organization_access
from src.utils import names
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from src.operations import provisioning
from src.models.roles import OrganizationRoles
from src.models.statuses import ApplicationStatus
from src.models.applications import ApplicationCreate, ApplicationResponse
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from kubernetes.client.exceptions import ApiException as KubernetesApiException
from src.database.services.applications import applications
from src.database.services.organizations import organizations

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
FORWARDED_REQUEST_BLOCKLIST = HOP_BY_HOP_HEADERS | {"authorization", "content-length", "cookie"}
FORWARDED_REQUEST_BLOCKLIST |= {"if-modified-since", "if-none-match"}
FORWARDED_REQUEST_BLOCKLIST |= {"x-user-id"}
FORWARDED_RESPONSE_BLOCKLIST = HOP_BY_HOP_HEADERS | {"content-length", "set-cookie"}

router = APIRouter()


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(user: User = Depends(authadmin)) -> list[ApplicationResponse]:
    """Return all applications for administrator views."""

    return await applications.list_all_responses(user)


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationResponse)
async def create_application(organization_id: UUID, payload: ApplicationCreate, user: User = Depends(authuser)) -> ApplicationResponse:
    """Register a new application in the database and deploy it on the compute cluster."""

    organization_record = await organization_access(organization_id, user)
    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    membership_role = await organizations.membership_role(organization_id, user.id)
    if membership_role not in {OrganizationRoles.admin, OrganizationRoles.maintain, OrganizationRoles.owner}:
        raise ForbiddenError("Application creation permissions required")

    try:
        application = await provisioning.create_application_runtime(organization_record, payload, user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc
    except RuntimeError as exc:
        raise UnavailableError(str(exc)) from exc

    return ApplicationResponse.model_validate(application)


@router.get("/api/applications/{application_id}/logs")
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed application."""

    # Validate the application and organization before connecting to the active cluster.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    organization_record = await organization_access(application.organization_id, user)

    registry = await provisioning.application_compute_registry(application, organization_record.location_id)
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
    description="Proxy supports DELETE, GET, PATCH, and POST for non-root application paths. The application root path is intentionally not proxied.",
)
async def proxy_application_request(
    application_id: UUID,
    request: Request,
    path: str = "",
    user: User = Depends(authuser),
) -> Response:
    """Proxy one supported non-root request into the deployed application service."""

    # Load the application and organization from the path-scoped identifier.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    organization = await organization_access(application.organization_id, user)

    if application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    registry = await provisioning.application_compute_registry(application, organization.location_id)
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{organization.location_id}'")

    upstream_path = path.lstrip("/")
    if upstream_path == "":
        raise NotFoundError("Proxy root path", "/")

    names.knames(organization.slug, "Organization")
    names.knames(application.slug, "Application name")
    # Strip hop-by-hop headers before forwarding the request upstream.
    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in FORWARDED_REQUEST_BLOCKLIST
    }
    forward_headers["x-user-id"] = str(user.id)
    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Forward the request body and response stream directly through the Kubernetes API client.
    try:
        body, status_code, upstream_headers = k8s.proxy(
            organization.slug,
            application.slug,
            upstream_path,
            request.method,
            query_params=list(request.query_params.multi_items()),
            headers=forward_headers,
            body=await request.body(),
        )
    except KubernetesApiException as exc:
        status = cast(Any, exc).status
        if str(status) == "503":
            return Response(status_code=503, headers={"cache-control": "no-store"})

        if str(status) == "304":
            headers = cast(Any, exc).headers or {}
            if hasattr(headers, "items"):
                upstream_headers = dict(headers.items())
            else:
                upstream_headers = {}

            return Response(
                status_code=304,
                headers={
                    key: value
                    for key, value in upstream_headers.items()
                    if key.lower() not in FORWARDED_RESPONSE_BLOCKLIST
                },
            )

        status_code = int(status) if status is not None else 500
        body = cast(Any, exc).body
        response_headers = cast(Any, exc).headers or {}

        return Response(
            content=body,
            status_code=status_code,
            headers={
                key: value
                for key, value in response_headers.items()
                if key.lower() not in FORWARDED_RESPONSE_BLOCKLIST
            },
        )

    # Filter hop-by-hop response headers so FastAPI can return a clean proxied response.
    return Response(
        content=body,
        status_code=status_code,
        headers={
            key: value
            for key, value in upstream_headers.items()
            if key.lower() not in FORWARDED_RESPONSE_BLOCKLIST
        },
    )
