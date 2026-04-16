import re
from typing import List
from fastapi import HTTPException
from pathlib import Path
from pydantic import BaseModel
from src.router import router
from fastapi.responses import Response

PAGES_DIR = Path(__file__).resolve().parents[2] / "pages"
PAGE_NAME_PATTERN = re.compile(r"^[a-z0-9-]+$")
PAGE_TAG_PATTERN = re.compile(r"<Page\s+([^>]+)>", re.IGNORECASE)
ATTR_PATTERN = re.compile(r'(\w+)="([^"]*)"')


class PageInfo(BaseModel):
    name: str
    path: str
    icon: str = "file-text"


def parse_page_attributes(xml_content: str) -> dict:
    """Extract attributes from a Page XML tag."""
    match = PAGE_TAG_PATTERN.search(xml_content)
    if not match:
        return {}
    attrs = {}
    for key, value in ATTR_PATTERN.findall(match.group(1)):
        attrs[key.lower()] = value
    return attrs


def get_all_pages() -> List[PageInfo]:
    """Scan the pages directory and return metadata for all available pages."""
    pages = []
    if not PAGES_DIR.is_dir():
        return pages
    for page_file in sorted(PAGES_DIR.glob("*.xml")):
        content = page_file.read_text(encoding="utf-8")
        attrs = parse_page_attributes(content)
        pages.append(
            PageInfo(
                name=attrs.get("name", page_file.stem.title()),
                path=page_file.stem,
                icon=attrs.get("icon", "file-text"),
            )
        )
    return pages


@router.get("/pages")
async def list_pages() -> List[PageInfo]:
    """Return a list of all available pages."""
    return get_all_pages()


@router.get("/pages/{page_name}")
async def get_page(page_name: str) -> Response:
    """Return the XML content of a specific page."""
    normalized_page_name = page_name.strip().lower()

    if not PAGE_NAME_PATTERN.match(normalized_page_name):
        raise HTTPException(status_code=404, detail="Page not found")

    page_path = (PAGES_DIR / f"{normalized_page_name}.xml").resolve()

    if not page_path.is_file() or page_path.parent != PAGES_DIR.resolve():
        raise HTTPException(status_code=404, detail="Page not found")

    return Response(
        content=page_path.read_text(encoding="utf-8"), media_type="application/xml"
    )
