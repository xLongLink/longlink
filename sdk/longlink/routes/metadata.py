from fastapi import APIRouter
from longlink.router import get

metadata_router = APIRouter()


@metadata_router.get("/openapi.json")
async def get_openapi():
    """Return current application OpenAPI schema."""

    return get.openapi()
