import httpx
import src.db as db
from typing import Any


async def raw(url: str, method: str = 'GET', params: dict[str, str] | None = None, json: dict[str, Any] | None = None, timeout: float = 30.0) -> httpx.Response:
    async with httpx.AsyncClient(timeout=timeout) as client:
        if method.upper() == 'GET':
            return await client.get(url, params=params)
        elif method.upper() == 'POST':
            return await client.post(url, params=params, json=json)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")



async def get(appid: str, url: str, params: dict[str, str] | None = None) -> httpx.Response:
    app = await db.apps.get_by_id(appid)
    if app is None:
        raise ValueError("App not found")
    return await raw(url, method='GET', params=params)


async def post(appid: str, url: str, params: dict[str, str], json: dict[str, Any] | None = None, timeout: float = 30.0) -> httpx.Response:
    app = await db.apps.get_by_id(appid)
    if app is None:
        raise ValueError("App not found")
    return await raw(url, method='POST', params=params, json=json, timeout=timeout)
