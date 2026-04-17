from fastapi import APIRouter
from longlink.router import api_router

pages_router = APIRouter()


@pages_router.get('/pages')
async def get_available_pages() -> list[dict[str, str]]:
    """Return metadata for all registered pages."""

    return api_router.pages()
