from fastapi import APIRouter, HTTPException
from src.constants import PAGES
from longlink.utils import Longlink
from fastapi.responses import Response

router = APIRouter(prefix="/api")


@router.get("/pages/{page_name}")
async def get_page(page_name: str) -> Response:
    """Return XML content for requested page."""
    page_path = (PAGES / f"{page_name.strip().lower()}").resolve()

    if not page_path.is_file() or page_path.parent != PAGES.resolve():
        raise HTTPException(status_code=404, detail="Document not found")

    document = Longlink(page_path)
    document.validate()
    return Response(content=document.content, media_type="application/xml")
