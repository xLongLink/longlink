from fastapi import Response, APIRouter
from longlink.state import Context

router = APIRouter()


@router.get("/pages")
async def get_available_pages(ctx: Context) -> list[dict[str, str]]:
    """Return metadata for all registered pages."""
    return [
        {
            "path": page.path.stem,
            "name": page.name,
            "icon": page.metadata.get("icon", "file-text"),
        }
        for page in ctx.pages
    ]


@router.get("/pages/{name}")
async def get_page(name: str, ctx: Context) -> Response:
    """Retrieve raw XML page content for a given page name."""
    normalized_name = name.strip().lower()
    for page in ctx.pages:
        if page.path.stem.strip().lower() == normalized_name:
            return Response(content=page.content, media_type="application/xml")
    return Response(content="", media_type="application/xml")
