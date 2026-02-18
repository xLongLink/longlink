import httpx
from fastapi import HTTPException, Request, Response

import src.db as db
from src.router import router
from src.models.apps import AppCreate, AppResponse


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


async def proxy_request(req: Request, app_name: str, full_path: str = '') -> Response:
    app = await db.apps.get_by_name(app_name)
    if app is None:
        raise HTTPException(
            status_code=404,
            detail=f"App '{app_name}' not found",
        )

    path = full_path.lstrip('/')
    target_url = app.url.rstrip('/')
    if path:
        target_url = f'{target_url}/{path}'

    headers = {
        k: v
        for k, v in req.headers.items()
        if k.lower() not in EXCLUDED_REQUEST_HEADERS
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upstream = await client.request(
                method=req.method,
                url=target_url,
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


@router.api_route('/apps/{app_name}', methods=ALLOWED_METHODS)
async def proxy_root(req: Request, app_name: str):
    return await proxy_request(req, app_name)


@router.api_route('/apps/{app_name}/{full_path:path}', methods=ALLOWED_METHODS)
async def proxy_path(req: Request, app_name: str, full_path: str):
    return await proxy_request(req, app_name, full_path)
