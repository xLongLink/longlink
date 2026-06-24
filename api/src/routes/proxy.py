from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter
from kubernetes.client.rest import ApiException
from src.auth import authuser
from src.errors import NotFoundError, UnavailableError, MethodNotAllowedError
from fastapi.routing import APIRoute
from src.utils.utils import knames
from src.utils.namespace import k8name
from src.adapters.compute import K8s
from src.database.models.users import User
from src.models.applications import ApplicationStatus
from src.database.services.compute import compute
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


class ProxyRoute(APIRoute):
    """Keep the proxy route on the explicit HTTP allowlist."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)

        # Starlette adds HEAD to GET routes automatically; remove it here.
        self.methods.discard("HEAD")


router = APIRouter()
proxy_router = APIRouter(route_class=ProxyRoute)


@router.head("/api/applications/proxy")
async def reject_proxy_head(organization_id: UUID, application_slug: str) -> None:
    """Reject HEAD requests on the application proxy."""

    raise MethodNotAllowedError()


@proxy_router.api_route(
    "/api/applications/proxy",
    methods=["DELETE", "GET", "PATCH", "POST"],
)
@proxy_router.api_route(
    "/api/applications/proxy/{path:path}",
    methods=["DELETE", "GET", "PATCH", "POST"],
)
async def proxy_app_request(
    organization_id: UUID,
    application_slug: str,
    request: Request,
    path: str = "",
    user: User = Depends(authuser),
) -> Response:
    """Proxy one request into the deployed application service."""

    # Load the organization and application from canonical route identifiers.
    organization = await organizations.get(organization_id)
    if organization is None:
        raise NotFoundError("Organization", organization_id)

    if not any(organization.id == organization_id for organization in user.organizations):
        raise NotFoundError("Organization", organization_id)

    application = await applications.get_by_slug(organization_id, application_slug)
    if application is None:
        raise NotFoundError("Application", application_slug)

    if application.status != ApplicationStatus.running:
        return _loading_response(application.status)

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
        # Keep proxy routing identifiers local to this service.
        query_params = [
            (key, value)
            for key, value in request.query_params.multi_items()
            if key not in {"organization_id", "application_slug"}
        ]
        upstream_response = k8s._api_client.call_api(
            resource_path,
            request.method,
            query_params=query_params,
            header_params=forward_headers,
            body=await request.body(),
            auth_settings=["BearerToken"],
            _preload_content=False,
            _return_http_data_only=False,
        )
    except ApiException as exc:
        if exc.status == 503:
            return _loading_response(application.status)
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


def _loading_response(status: ApplicationStatus) -> Response:
    """Return a lightweight loading page while the app is not ready."""

    return Response(
        content=(
            "<html><body style='font-family: sans-serif; padding: 2rem;'>"
            f"<h1>Application is {status.value}</h1>"
            "<p>Please try again in a moment.</p>"
            "</body></html>"
        ),
        status_code=503,
        media_type="text/html",
        headers={"cache-control": "no-store"},
    )


router.include_router(proxy_router)
