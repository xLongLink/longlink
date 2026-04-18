from fastapi import Request, APIRouter


router = APIRouter()


@router.get("/pages")
async def get_available_pages(request: Request) -> list[dict[str, str]]:
    """Return metadata for all registered pages."""

    return request.app.state.pages
