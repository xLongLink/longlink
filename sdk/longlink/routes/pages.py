from fastapi import Request, APIRouter

pages_router = APIRouter()


@pages_router.get("/pages")
async def get_available_pages(request: Request) -> list[dict[str, str]]:
    """Return metadata for all registered pages."""

    return request.app.state.pages
