import httpx2
from fastapi import Depends, HTTPException, Request, Response, status

import src.db as db
from src.adapters.compute.k8s import K8s
from src.auth import authuser
from src.router import router
from src.routes.apps import APP_SERVICE_PORT
from src.utils.namespace import k8name
from src.utils.utils import knames, normalize

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
async def proxy_app_request(app_id: int, request: Request, path: str = "", user: db.User = Depends(authuser)) -> Response:
    """Proxy one request into the deployed application service."""

    app = await db.apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")

    org = next((org for org in user.orgs if org.name == app.organization), None)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{app.organization}' not found")
    if org.location_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Org '{app.organization}' has no location configured")

    registries = [registry for registry in await db.compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    # Prefer the newest registry for the location so the live gateway secret stays in sync.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{org.location_id}'",
        )

    compute = K8s(registry.kubeconfig, registry.proxy_secret)

    upstream_path = path.lstrip("/")
    namespace = k8name(knames(app.organization, "Org"))
    name = knames(app.slug, "Application name")
    base = f"{normalize(registry.ingress_host)}/api/v1/namespaces/{namespace}/services/{name}:{APP_SERVICE_PORT}/proxy/"
    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "authorization"
    }
    forward_headers["authorization"] = compute.authorization_header()

    async with httpx2.AsyncClient(verify=False) as api_client:
        upstream_response = await api_client.request(
            request.method,
            f"{base}{upstream_path}",
            params=list(request.query_params.multi_items()),
            headers=forward_headers,
            content=await request.body(),
        )

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers={
            key: value
            for key, value in upstream_response.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length"
        },
    )
