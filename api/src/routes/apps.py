import httpx
from fastapi import HTTPException, Request, Response

import src.db as db
from src.router import router
from src.types import AppCreate, AppResponse

APP_BACKEND_URL = 'http://localhost:1707'

ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

EXCLUDED_REQUEST_HEADERS = {
    'host',
    'content-length',
    'accept-encoding',
    'connection',
}

EXCLUDED_RESPONSE_HEADERS = {
    'content-length',
    'transfer-encoding',
    'content-encoding',
    'connection',
}

client = httpx.AsyncClient(
    base_url=APP_BACKEND_URL,
    timeout=30.0,
)


async def proxy_request(req: Request, app_id: str, full_path: str = '') -> Response:
    path = f'{app_id}'
    if full_path:
        path += f'/{full_path}'

    headers = {
        k: v
        for k, v in req.headers.items()
        if k.lower() not in EXCLUDED_REQUEST_HEADERS
    }

    try:
        upstream = await client.request(
            method=req.method,
            url=path,
            params=req.query_params,
            content=await req.body(),
            headers=headers,
        )

        response_headers = {
            k: v
            for k, v in upstream.headers.items()
            if k.lower() not in EXCLUDED_RESPONSE_HEADERS
        }

        return Response(
            content=upstream.content,
            status_code=upstream.status_code,
            headers=response_headers,
        )

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f'Could not reach app backend: {exc}',
        )


@router.get('/apps')
async def list_apps() -> list[AppResponse]:
    apps = await db.apps.list()
    return [
        AppResponse(
            id=app.id,
            name=app.name,
            url=app.url,
        )
        for app in apps
    ]


@router.post('/apps')
async def create_app(payload: AppCreate) -> AppResponse:
    try:
        app = await db.apps.create(
            name=payload.name,
            url=payload.url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return AppResponse(
        id=app.id,
        name=app.name,
        url=app.url,
    )


@router.api_route('/apps/{app_id}', methods=ALLOWED_METHODS)
async def proxy_root(req: Request, app_id: str):
    return await proxy_request(req, app_id)


@router.api_route('/apps/{app_id}/{full_path:path}', methods=ALLOWED_METHODS)
async def proxy_path(req: Request, app_id: str, full_path: str):
    return await proxy_request(req, app_id, full_path)
