import asyncio
from urllib import error
from urllib import request

from fastapi import HTTPException
from fastapi import Request
from fastapi import Response

from src.router import router

APP_BACKEND_URL = 'http://localhost:1707'
ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
EXCLUDED_REQUEST_HEADERS = {
    'accept-encoding',
    'connection',
    'content-length',
    'host',
}
EXCLUDED_RESPONSE_HEADERS = {
    'connection',
    'content-encoding',
    'content-length',
    'transfer-encoding',
}


def _build_forward_url(app_id: str, full_path: str, raw_query: str) -> str:
    base_path = f'/apps/{app_id}'
    if full_path:
        base_path = f'{base_path}/{full_path}'
    if raw_query:
        return f'{APP_BACKEND_URL}{base_path}?{raw_query}'
    return f'{APP_BACKEND_URL}{base_path}'


def _build_forward_headers(req: Request) -> dict[str, str]:
    headers = {
        key: value
        for key, value in req.headers.items()
        if key.lower() not in EXCLUDED_REQUEST_HEADERS
    }
    return headers


def _extract_response_headers(upstream_headers: request.HTTPMessage) -> dict[str, str]:
    headers = {
        key: value
        for key, value in upstream_headers.items()
        if key.lower() not in EXCLUDED_RESPONSE_HEADERS
    }
    return headers


async def _proxy_request(req: Request, app_id: str, full_path: str = '') -> Response:
    target_url = _build_forward_url(app_id, full_path, req.url.query)
    body = await req.body()
    forward_request = request.Request(
        url=target_url,
        data=body if len(body) > 0 else None,
        headers=_build_forward_headers(req),
        method=req.method,
    )

    def _open() -> tuple[int, bytes, dict[str, str]]:
        with request.urlopen(forward_request) as upstream_response:
            upstream_body = upstream_response.read()
            upstream_status = upstream_response.getcode()
            upstream_headers = _extract_response_headers(upstream_response.headers)
            return upstream_status, upstream_body, upstream_headers

    try:
        status_code, content, response_headers = await asyncio.to_thread(_open)
        return Response(content=content, status_code=status_code, headers=response_headers)
    except error.HTTPError as exc:
        content = exc.read()
        response_headers = _extract_response_headers(exc.headers)
        return Response(content=content, status_code=exc.code, headers=response_headers)
    except error.URLError as exc:
        raise HTTPException(status_code=502, detail=f'Could not reach app backend: {exc.reason}') from exc


@router.api_route('/apps/{app_id}', methods=ALLOWED_METHODS)
async def proxy_app_root(req: Request, app_id: str) -> Response:
    return await _proxy_request(req, app_id)


@router.api_route('/apps/{app_id}/{full_path:path}', methods=ALLOWED_METHODS)
async def proxy_app_path(req: Request, app_id: str, full_path: str) -> Response:
    return await _proxy_request(req, app_id, full_path)
