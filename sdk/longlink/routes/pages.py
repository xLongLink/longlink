from fastapi import APIRouter
from longlink.state import Context


router = APIRouter()


@router.get("/pages")
async def get_available_pages(ctx: Context) -> list[dict[str, str]]:
    """Return metadata for all registered pages."""
    return ctx.pages


@router.get("/pages/{name}")
async def get_page(name: str, ctx: Context) -> dict:
    """Retrieve full page schema for a given page name."""
    for page in ctx.pages:
        if page.name == name:
            return page.schema
    return {}
