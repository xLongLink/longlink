# pyright: reportReturnType=false, reportUnknownVariableType=false, reportUnknownMemberType=false, reportAttributeAccessIssue=false

from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter
from src.auth import authuser, authadmin, organization_access
from src.errors import ConflictError, NotFoundError, UnavailableError
from src.utils import names
from src.models.common import SuccessResponse
from kubernetes.client.rest import ApiException
from src.models.applications import (ApplicationCreate, ApplicationStatus,
                                      ApplicationResponse)
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from src.operations import provisioning
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
FORWARDED_REQUEST_BLOCKLIST = HOP_BY_HOP_HEADERS | {"authorization", "cookie"}
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

    try:
        return await provisioning.create_application_runtime(organization_record, payload, user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc
    except RuntimeError as exc:
        raise UnavailableError(str(exc)) from exc


@router.delete("/api/applications/{application_id}", response_model=SuccessResponse)
async def delete_application(application_id: UUID, user: User = Depends(authadmin)) -> SuccessResponse:
    """Queue application deletion and return immediately."""

    try:
        application = await provisioning.queue_application_delete(application_id, user)
    except RuntimeError as exc:
        raise UnavailableError(str(exc)) from exc

    if application is None:
        raise NotFoundError("Application", application_id)

    return SuccessResponse()


@router.get("/api/applications/{application_id}/logs")
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed application."""

    # Validate the application and organization before connecting to the active cluster.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    organization_record = await organization_access(application.organization_id, user)

    registry = await provisioning.latest_compute_registry(organization_record.location_id)
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

    registry = await provisioning.latest_compute_registry(organization.location_id)
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
    except ApiException as exc:
        if exc.status == 503:
            return Response(status_code=503, headers={"cache-control": "no-store"})
        raise

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
