from fastapi import APIRouter, HTTPException
from src.constants import PAGES
from longlink.utils import Page
from fastapi.responses import Response

router = APIRouter(prefix="/api")


@router.get("/pages/{page_name}")
async def get_page(page_name: str) -> Response:
    """Return XML content for requested page."""
    page_path = (PAGES / f"{page_name.strip().lower()}.xml").resolve()

    if not page_path.is_file() or page_path.parent != PAGES.resolve():
        raise HTTPException(status_code=404, detail="Page not found")

    page = Page(page_path)
    page.validate()
    return Response(content=page.content, media_type="application/xml")
