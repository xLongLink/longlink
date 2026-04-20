from typing import List
from fastapi import APIRouter, HTTPException
from pathlib import Path
from pydantic import BaseModel
from src.utils.page import Page
from fastapi.responses import Response

router = APIRouter()

PAGES_DIR = Path(__file__).resolve().parents[1] / "pages"


class PageInfo(BaseModel):
    name: str
    path: str
    icon: str = "file-text"


def get_all_pages() -> List[PageInfo]:
    """Scan pages directory and return metadata for each XML page."""
    pages: List[PageInfo] = []
    if not PAGES_DIR.is_dir():
        return pages

    page_order = ["applications"]

    for page_file in sorted(PAGES_DIR.glob("*.xml")):
        page = Page(page_file)
        pages.append(
            PageInfo(
                name=page.metadata.get("name", page_file.stem.replace("-", " ").title()),
                path=page_file.stem,
                icon=page.metadata.get("icon", "file-text"),
            )
        )

    pages.sort(key=lambda p: page_order.index(p.path) if p.path in page_order else 999)
    return pages


@router.get("/pages")
async def list_pages() -> List[PageInfo]:
    """Return list of all available pages."""
    return get_all_pages()


@router.get("/pages/{page_name}")
async def get_page(page_name: str) -> Response:
    """Return XML content for requested page."""
    page_path = (PAGES_DIR / f"{page_name.strip().lower()}.xml").resolve()

    if not page_path.is_file() or page_path.parent != PAGES_DIR.resolve():
        raise HTTPException(status_code=404, detail="Page not found")

    page = Page(page_path)
    return Response(content=page.content, media_type="application/xml")
