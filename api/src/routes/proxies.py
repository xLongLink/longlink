import os
import json
import httpx
import src.db as db
from fastapi import Request, Response, APIRouter, HTTPException
from src.models.apps import AppResponse
from fastapi.responses import JSONResponse
from src.utils.compute import compute as compute_state

ALLOWED_METHODS = ["GET", "POST"]
CLUSTER_URL = os.getenv("CLUSTER_URL", "http://localhost:8080").rstrip("/")

router = APIRouter()
client_http = httpx.AsyncClient()


async def _get_app(app_name: str):
    """Resolve one registered app by UUID first, then by name."""
    app = await db.apps.get_by_uuid(app_name)
    if app is None:
        app = await db.apps.get_by_name(app_name)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")
    return app


async def _forward(path: str, request: Request) -> Response:
    """Proxy one request through the shared ingress endpoint."""
    upstream = await client_http.request(
        request.method,
        f"{CLUSTER_URL}/{path}",
        content=await request.body(),
        headers={
            **{k: v for k, v in request.headers.items() if k.lower() != "host"},
            "Host": compute_state.ingress_host,
        },
        params=request.query_params,
    )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=dict(upstream.headers),
    )


@router.get("/apps")
async def list_apps() -> list[AppResponse]:
    """List registered apps."""
    registered_apps = await db.apps.list()

    return [
        AppResponse(id=app.id, name=app.name, url=app.url)
        for app in registered_apps
    ]


@router.api_route("/apps/{app_name}", methods=ALLOWED_METHODS)
async def proxy_root(req: Request, app_name: str):
    """Proxy requests to app root to fetch pages listing."""
    app = await _get_app(app_name)

    try:
        upstream = await _forward(f"{app.key}/pages", req)

        if not 200 <= upstream.status_code < 300:
            raise HTTPException(
                status_code=upstream.status_code,
                detail="Unable to fetch pages from the app",
            )

        try:
            pages = json.loads(upstream.body)
        except ValueError as exc:
            raise HTTPException(
                status_code=502,
                detail="Invalid pages response from app",
            ) from exc

        return JSONResponse(content={"pages": pages}, status_code=200)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Upstream request failed")


@router.api_route("/apps/{app_name}/{full_path:path}", methods=ALLOWED_METHODS)
async def proxy_path(req: Request, app_name: str, full_path: str):
    """Proxy requests with path to the target app."""
    app = await _get_app(app_name)

    path = full_path.lstrip("/")

    try:
        return await _forward(f"{app.key}/{path}", req)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Upstream request failed")
