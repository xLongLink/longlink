from fastapi import APIRouter, Depends, Request, Response, HTTPException
from fastapi.routing import APIRoute
from src.auth import authuser
from src.router import router
from src.utils.utils import knames
from src.utils.namespace import k8name
from src.adapters.compute import K8s
from src.database.models.users import User
from src.database.services.compute import compute
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


class ProxyRoute(APIRoute):
    """Keep the proxy route on the explicit HTTP allowlist."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)

        # Starlette adds HEAD to GET routes automatically; remove it here.
        self.methods.discard("HEAD")


proxy_router = APIRouter(route_class=ProxyRoute)


@router.head("/api/apps/{application_id}/proxy")
async def reject_proxy_head(application_id: str) -> None:
    """Reject HEAD requests on the application proxy."""

    raise HTTPException(status_code=405, detail="Method not allowed")


@proxy_router.api_route(
    "/api/apps/{application_id}/proxy",
    methods=["DELETE", "GET", "PATCH", "POST"],
)
@proxy_router.api_route(
    "/api/apps/{application_id}/proxy/{path:path}",
    methods=["DELETE", "GET", "PATCH", "POST"],
)
async def proxy_app_request(application_id: str, request: Request, path: str = "", user: User = Depends(authuser)) -> Response:
    """Proxy one request into the deployed application service."""

    # Load the app first so routing never depends on the caller-supplied path alone.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    organization = next((organization for organization in user.organizations if organization.id == application.organization_id), None)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Organization '{application.organization_id}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Prefer the newest registry for the location so the live cluster stays in sync.
    registry = max(
        (registry for registry in registries if registry.location_id == organization.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise HTTPException(
            status_code=503,
            detail=f"No compute cluster configured for location '{organization.location_id}'",
        )

    upstream_path = path.lstrip("/")
    if upstream_path == "":
        raise HTTPException(status_code=404, detail="Proxy root path is not available")

    namespace = k8name(knames(application.organization_id, "Organization"))
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


router.include_router(proxy_router)
