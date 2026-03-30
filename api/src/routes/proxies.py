import httpx
import src.db as db
from fastapi import Request, Response, HTTPException
from src.utils import apps
from src.router import router
from fastapi.responses import JSONResponse

ALLOWED_METHODS = ['GET', 'POST']


async def proxy_request(req: Request, app_name: str, full_path: str = '') -> Response:
    app = await db.apps.get_by_name(app_name)
    if not app:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    path = full_path.lstrip('/')
    is_metadata_request = req.method == 'GET' and path == ''

    if is_metadata_request:
        path = 'pages'

    query_params = dict(req.query_params)
    query_params.setdefault('key', app.key)

    try:
        method = req.method.upper()
        if method == 'GET':
            upstream = await apps.get(app.id, path, params=query_params)
        elif method == 'POST':
            json_payload = await req.json() if req.headers.get('content-type', '').startswith('application/json') else None
            upstream = await apps.post(app.id, path, params=query_params, json=json_payload)
        else:
            raise HTTPException(status_code=405, detail=f"Method '{method}' is not allowed")

        if is_metadata_request:
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

        return Response(content=upstream.content, status_code=upstream.status_code)

    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Upstream request failed")


@router.api_route('/apps/{app_name}', methods=ALLOWED_METHODS)
async def proxy_root(req: Request, app_name: str):
    return await proxy_request(req, app_name)


@router.api_route('/apps/{app_name}/{full_path:path}', methods=ALLOWED_METHODS)
async def proxy_path(req: Request, app_name: str, full_path: str):
    return await proxy_request(req, app_name, full_path)
