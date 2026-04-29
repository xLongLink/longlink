import json
import httpx
import src.db as db
from fastapi import Request, Response, APIRouter, HTTPException
from src.models.apps import AppResponse
from src.utils.utils import COMPUTE_URL, app_url, app_path
from fastapi.responses import JSONResponse

router = APIRouter()
client_http = httpx.AsyncClient()


async def _get_app(app_name: str):
    """Resolve one registered app by name."""
    app = await db.apps.get(app_name)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")
    return app


async def _forward(path: str, request: Request) -> Response:
    """Proxy one request through the shared ingress endpoint."""
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in ("host",)
    }

    upstream = await client_http.request(
        request.method,
        f"{COMPUTE_URL}/{path}",
        content=await request.body(),
        headers=headers,
        params=request.query_params,
    )

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in (
            "content-encoding",
            "content-length",
            "transfer-encoding",
            "connection",
        )
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
    )


@router.get("/apps")
async def list_apps() -> list[AppResponse]:
    """List registered apps."""
    registered_apps = await db.apps.list()
    return [
        AppResponse(name=app.name, url=app_url(app.name))
        for app in registered_apps
    ]


@router.get("/apps/{app_name}/metadata")
async def get_app_metadata(req: Request, app_name: str):
    """Return app metadata used by the control-plane web runtime."""
    app = await _get_app(app_name)
    upstream = await _forward(app_path(app.name, "pages"), req)

    if not 200 <= upstream.status_code < 300:
        return upstream

    pages = json.loads(upstream.body)
    return JSONResponse(
        content={
            "name": app.name,
            "url": app_url(app.name),
            "pages": pages,
        },
        status_code=200,
    )


@router.api_route("/apps/{app_name}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_root(req: Request, app_name: str):
    """Proxy requests to the app root through the shared ingress endpoint."""
    app = await _get_app(app_name)
    return await _forward(app_path(app.name), req)


@router.api_route("/apps/{app_name}/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_path(req: Request, app_name: str, full_path: str):
    """Proxy requests with path to the target app."""
    app = await _get_app(app_name)
    return await _forward(app_path(app.name, full_path), req)
