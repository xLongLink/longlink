import httpx
import src.db as db
from fastapi import Request, Response, HTTPException
from src.utils import apps
from src.router import router
from fastapi.responses import JSONResponse

ALLOWED_METHODS = ['GET', 'POST']


@router.api_route('/apps/{app_name}', methods=ALLOWED_METHODS)
async def proxy_root(req: Request, app_name: str):
    app = await db.apps.get_by_uuid(app_name)
    if not app:
        app = await db.apps.get_by_name(app_name)
    if not app:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    query_params = dict(req.query_params)
    query_params.setdefault('key', app.key)

    try:
        upstream = await apps.request(app.id, req.method.upper(), 'pages', params=query_params)

        if not upstream.is_success:
            raise HTTPException(
                status_code=upstream.status_code,
                detail='Unable to fetch pages from the app',
            )

        try:
            pages = upstream.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=502,
                detail='Invalid pages response from app',
            ) from exc

        return JSONResponse(content={'pages': pages}, status_code=200)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail='Upstream request failed')


@router.api_route('/apps/{app_name}/{full_path:path}', methods=ALLOWED_METHODS)
async def proxy_path(req: Request, app_name: str, full_path: str):
    app = await db.apps.get_by_uuid(app_name)
    if not app:
        app = await db.apps.get_by_name(app_name)
    if not app:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    path = full_path.lstrip('/')
    query_params = dict(req.query_params)
    query_params.setdefault('key', app.key)

    try:
        json_payload = None
        if req.method.upper() == 'POST' and req.headers.get('content-type', '').startswith('application/json'):
            json_payload = await req.json()

        upstream = await apps.request(app.id, req.method.upper(), path, params=query_params, json=json_payload)
        content_type = upstream.headers.get('content-type', 'text/plain')
        return Response(content=upstream.content, status_code=upstream.status_code, media_type=content_type)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail='Upstream request failed')
