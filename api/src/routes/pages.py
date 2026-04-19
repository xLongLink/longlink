import xmltodict
from typing import List
from fastapi import APIRouter, HTTPException
from pathlib import Path
from pydantic import BaseModel
from fastapi.responses import Response
from xml.parsers.expat import ExpatError

router = APIRouter()

PAGES_DIR = Path(__file__).resolve().parents[1] / "pages"
PAGE_NAME_PATTERN = "abcdefghijklmnopqrstuvwxyz0123456789-"


class PageInfo(BaseModel):
    name: str
    path: str
    icon: str = "file-text"


def parse_page_attributes(xml_content: str) -> dict[str, str]:
    """Extract normalized attributes from root <Page> tag."""
    try:
        parsed_xml = xmltodict.parse(xml_content)
    except ExpatError:
        return {}

    page_node = parsed_xml.get("Page")
    if not isinstance(page_node, dict):
        return {}

    # Normalize root attribute names from xmltodict keys like @name, @icon.
    attributes: dict[str, str] = {}
    for key, value in page_node.items():
        if not key.startswith("@") or not isinstance(value, str):
            continue
        attributes[key.removeprefix("@").lower()] = value

    return attributes


def get_all_pages() -> List[PageInfo]:
    """Scan pages directory and return metadata for each XML page."""
    pages: List[PageInfo] = []
    if not PAGES_DIR.is_dir():
        return pages

    page_order = ["applications", "settings"]

    for page_file in sorted(PAGES_DIR.glob("*.xml")):
        if page_file.stem == "profile":
            continue
        attrs = parse_page_attributes(page_file.read_text(encoding="utf-8"))
        pages.append(
            PageInfo(
                name=attrs.get("name", page_file.stem.replace("-", " ").title()),
                path=page_file.stem,
                icon=attrs.get("icon", "file-text"),
            )
        )

    pages.sort(key=lambda p: page_order.index(p.path) if p.path in page_order else 999)
    return pages


def normalize_page_name(page_name: str) -> str:
    """Normalize and validate page name used in file lookup."""
    normalized_page_name = page_name.strip().lower()
    if not normalized_page_name:
        raise HTTPException(status_code=404, detail="Page not found")

    if any(char not in PAGE_NAME_PATTERN for char in normalized_page_name):
        raise HTTPException(status_code=404, detail="Page not found")

    return normalized_page_name


@router.get("/pages")
async def list_pages() -> List[PageInfo]:
    """Return list of all available pages."""
    return get_all_pages()


@router.get("/pages/{page_name}")
async def get_page(page_name: str) -> Response:
    """Return XML content for requested page."""
    normalized_page_name = normalize_page_name(page_name)
    page_path = (PAGES_DIR / f"{normalized_page_name}.xml").resolve()

    if not page_path.is_file() or page_path.parent != PAGES_DIR.resolve():
        raise HTTPException(status_code=404, detail="Page not found")

    return Response(
        content=page_path.read_text(encoding="utf-8"),
        media_type="application/xml",
    )
