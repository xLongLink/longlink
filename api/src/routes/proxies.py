import json
import httpx
import src.db as db
from fastapi import Request, Response, APIRouter, HTTPException
from src.models.apps import AppResponse
from fastapi.responses import JSONResponse
from src.utils.compute import compute as compute_state
from src.utils.compute_urls import CLUSTER_URL, app_url, app_path

ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
HOP_BY_HOP_HEADERS = {
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}

router = APIRouter()
client_http = httpx.AsyncClient()


async def _get_app(app_name: str):
    """Resolve one registered app by UUID, name, or key."""
    app = await db.apps.get_by_uuid(app_name)
    if app is None:
        app = await db.apps.get_by_name(app_name)
    if app is None:
        app = await db.apps.get_by_key(app_name)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")
    return app


def _compute_path(app, full_path: str = "") -> str:
    """Return the compute ingress path for one public app route."""
    return app_path(app.key, full_path)


def _upstream_headers(request: Request) -> dict[str, str]:
    """Return request headers suitable for the compute ingress upstream."""
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "host"
    }
    headers["Host"] = compute_state.ingress_host
    return headers


def _downstream_headers(upstream: httpx.Response) -> dict[str, str]:
    """Return response headers suitable for the control-plane client."""
    return {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }


async def _forward(path: str, request: Request) -> Response:
    """Proxy one request through the shared ingress endpoint."""
    upstream = await client_http.request(
        request.method,
        f"{CLUSTER_URL}/{path}",
        content=await request.body(),
        headers=_upstream_headers(request),
        params=request.query_params,
    )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=_downstream_headers(upstream),
    )


@router.get("/apps")
async def list_apps() -> list[AppResponse]:
    """List registered apps."""
    registered_apps = await db.apps.list()

    return [
        AppResponse(id=app.id, name=app.name, url=app_url(app.key))
        for app in registered_apps
    ]


@router.get("/apps/{app_name}/metadata")
async def get_app_metadata(req: Request, app_name: str):
    """Return app metadata used by the control-plane web runtime."""
    app = await _get_app(app_name)
    upstream = await _forward(_compute_path(app, "pages"), req)

    if not 200 <= upstream.status_code < 300:
        return upstream

    pages = json.loads(upstream.body)

    return JSONResponse(
        content={
            "id": app.id,
            "name": app.name,
            "url": app_url(app.key),
            "pages": pages,
        },
        status_code=200,
    )


@router.api_route("/apps/{app_name}", methods=ALLOWED_METHODS)
async def proxy_root(req: Request, app_name: str):
    """Proxy requests to the app root through the shared ingress endpoint."""
    app = await _get_app(app_name)
    return await _forward(_compute_path(app), req)


@router.api_route("/apps/{app_name}/{full_path:path}", methods=ALLOWED_METHODS)
async def proxy_path(req: Request, app_name: str, full_path: str):
    """Proxy requests with path to the target app."""
    app = await _get_app(app_name)

    return await _forward(_compute_path(app, full_path), req)
