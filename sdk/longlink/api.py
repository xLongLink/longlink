import os
import httpx
from typing import Any


DEFAULT_CONTROL_PANEL_URL = 'http://localhost:8000'


def get_control_panel_url() -> str:
    return os.getenv('LONGLINK_CONTROL_PANEL_URL', DEFAULT_CONTROL_PANEL_URL).rstrip('/')


def _build_url(path: str) -> str:
    normalized_path = path if path.startswith('/') else f'/{path}'
    return f'{get_control_panel_url()}{normalized_path}'


def _parse_response(response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None

    content_type = response.headers.get('content-type', '')
    if 'application/json' in content_type:
        return response.json()

    return response.text


def _raise_for_status(response: httpx.Response) -> None:
    if response.is_success:
        return

    message = f'API request failed ({response.status_code})'

    try:
        body = response.json()
    except ValueError:
        body = None

    if isinstance(body, dict):
        message = body.get('detail') or body.get('message') or message

    raise httpx.HTTPStatusError(message, request=response.request, response=response)


async def get(
    path: str,
    params: dict[str, str | int | float | bool | None] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    request_headers = {
        'Accept': 'application/json',
        **(headers or {}),
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            _build_url(path),
            params=params,
            headers=request_headers,
        )

    _raise_for_status(response)
    return _parse_response(response)


async def post(
    path: str,
    body: Any = None,
    params: dict[str, str | int | float | bool | None] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    request_headers = {
        'Accept': 'application/json',
        **(headers or {}),
    }

    request_kwargs: dict[str, Any] = {
        'params': params,
        'headers': request_headers,
    }

    if isinstance(body, (dict, list)):
        request_kwargs['json'] = body
    elif body is not None:
        request_kwargs['content'] = body

    async with httpx.AsyncClient() as client:
        response = await client.post(
            _build_url(path),
            **request_kwargs,
        )

    _raise_for_status(response)
    return _parse_response(response)
