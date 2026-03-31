import httpx
import asyncio
import src.db as db
from typing import Any, Literal


HttpMethod = Literal['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
_lock = asyncio.Lock()
_clients: dict[str, httpx.AsyncClient] = {}


async def close():
    for client in _clients.values():
        await client.aclose()
    _clients.clear()


async def raw(url: str, method: HttpMethod = 'GET', headers: dict[str, str] | None = None, params: dict[str, str] | None = None, json: dict[str, Any] | None = None) -> httpx.Response:
    """Make a raw HTTP request. This can be used to call an app before it's registered into the system, for the metadata fetching for example."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.request(method=method, url=url, headers=headers, params=params, json=json)


async def request(uuid: str, method: HttpMethod, url: str, params: dict[str, str] | None = None, json: dict[str, Any] | None = None) -> httpx.Response:
    """Make a request to an app. This will automatically handle authentication and connection pooling."""
    client = _clients.get(uuid)
    if client is None:
        async with _lock:
            app = await db.apps.get_by_uuid(uuid)
            if app is None:
                raise ValueError('App not found')
        
            client = httpx.AsyncClient(
                base_url=app.url,
                headers={"Authorization": f"Bearer {app.token}"},
                timeout=30.0,
                limits=httpx.Limits(
                    max_connections=50,
                    max_keepalive_connections=10,
                    keepalive_expiry=30.0,
                ),
            )

            _clients[uuid] = client
    
    return await client.request(method=method, url=url, params=params, json=json)

# Convenience wrappers
async def get(uuid: str, url: str, params: dict[str, str] | None = None):
    """Make a GET request to an app. Used to retrieve resources."""
    return await request(uuid, 'GET', url, params=params)


async def post( uuid: str, url: str, params: dict[str, str] | None = None, json: dict[str, Any] | None = None):
    """Make a POST request to an app. Used to create resources."""
    return await request(uuid, 'POST', url, params=params, json=json)


async def put(uuid: str, url: str, params: dict[str, str] | None = None, json: dict[str, Any] | None = None):
    """Make a PUT request to an app. Used to update/replace resources. (full replace)"""
    return await request(uuid, 'PUT', url, params=params, json=json)


async def patch( uuid: str, url: str, params: dict[str, str] | None = None, json: dict[str, Any] | None = None):
    """Make a PATCH request to an app. Used to partially update resources. (partial replace)"""
    return await request(uuid, 'PATCH', url, params=params, json=json)


async def delete(uuid: str,url: str, params: dict[str, str] | None = None ):
    """Make a DELETE request to an app. Used to delete resources."""
    return await request(uuid, 'DELETE', url, params=params)


# async def head( uuid: str, url: str, params: dict[str, str] | None = None):
#     """Make a HEAD request to an app."""
#     return await request(uuid, 'HEAD', url, params=params)


# async def options(uuid: str,url: str,params: dict[str, str] | None = None):
#     """Make an OPTIONS request to an app."""
#     return await request(uuid, 'OPTIONS', url, params=params)