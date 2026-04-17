from fastapi import Request, APIRouter

metadata_router = APIRouter()


@metadata_router.get("/openapi.json")
async def get_openapi(request: Request):
    """Return current application OpenAPI schema."""

    return request.app.openapi()
