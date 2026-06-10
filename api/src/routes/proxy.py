from fastapi import Depends, Request, Response, HTTPException, status
from src.auth import authuser
from src.router import router
from src.utils.utils import knames
from src.utils.namespace import k8name
from src.adapters.compute import K8s
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.applications import apps

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


@router.api_route("/api/apps/{app_id}/proxy", methods=["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"])
@router.api_route("/api/apps/{app_id}/proxy/{path:path}", methods=["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"])
async def proxy_app_request(app_id: int, request: Request, path: str = "", user: User = Depends(authuser)) -> Response:
    """Proxy one request into the deployed application service."""

    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")

    org = next((org for org in user.orgs if org.name == app.organization), None)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{app.organization}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    # Prefer the newest registry for the location so the live cluster stays in sync.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{org.location_id}'",
        )

    upstream_path = path.lstrip("/")
    namespace = k8name(knames(app.organization, "Org"))
    name = knames(app.slug, "Application name")
    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "authorization"
    }
    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    resource_path = f"/api/v1/namespaces/{namespace}/services/{name}/proxy"
    if upstream_path != "":
        resource_path = f"{resource_path}/{upstream_path}"

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

    return Response(
        content=body.data,
        status_code=status_code,
        headers={
            key: value
            for key, value in upstream_headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length"
        },
    )
