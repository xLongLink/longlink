from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, Request, Response
from pydantic import BaseModel

import src.db as db
from src.models.apps import AppCreate, AppResponse
from src.router import router


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


class AppMetadata(BaseModel):
    name: str


def normalize_app_url(url: str) -> str:
    cleaned_url = url.strip().rstrip('/')
    if cleaned_url == '':
        raise ValueError('App URL is required')

    parsed = urlparse(cleaned_url)
    if parsed.scheme == '':
        cleaned_url = f'http://{cleaned_url}'
        parsed = urlparse(cleaned_url)

    if parsed.netloc == '':
        raise ValueError('Invalid app URL')

    return cleaned_url


async def fetch_app_metadata(url: str, token: str) -> AppMetadata:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f'{url}/metadata.json',
                params={'key': token},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f'Could not fetch app metadata: {exc}',
        ) from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=400,
            detail='App metadata endpoint returned an error',
        )

    try:
        payload = response.json()
        if isinstance(payload, dict) and payload.get('detail') == 'Invalid app key':
            raise HTTPException(status_code=401, detail='Invalid app key')

        return AppMetadata.model_validate(payload)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail='Invalid metadata.json response')


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
        ) from exc


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
        app_url = normalize_app_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    metadata = await fetch_app_metadata(app_url, payload.token)

    try:
        app = await db.apps.create(
            name=metadata.name,
            url=app_url,
            token=payload.token,
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
