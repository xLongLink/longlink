import httpx
import src.db as db
from fastapi import HTTPException, Request, Response
from src.router import router


ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']


async def proxy_request(req: Request, app_name: str, full_path: str = '') -> Response:
    app = await db.apps.get_by_name(app_name)
    if not app:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    # Build target URL
    path = full_path.lstrip('/')
    target_url = app.url.rstrip('/')
    if path:
        target_url = f"{target_url}/{path}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upstream = await client.request(
                method=req.method,
                url=target_url,
                params=req.query_params,
                content=await req.body() if req.method in ['POST', 'PUT', 'PATCH'] else None,
            )

        return Response(content=upstream.content, status_code=upstream.status_code )

    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Upstream request failed")


@router.api_route('/apps/{app_name}', methods=ALLOWED_METHODS)
async def proxy_root(req: Request, app_name: str):
    return await proxy_request(req, app_name)


@router.api_route('/apps/{app_name}/{full_path:path}', methods=ALLOWED_METHODS)
async def proxy_path(req: Request, app_name: str, full_path: str):
    return await proxy_request(req, app_name, full_path)