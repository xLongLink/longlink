from fastapi import APIRouter
from src.constants import PAGES
from longlink.utils import Page

router = APIRouter(prefix="/api")

USER_PAGES = [
    {"name": "Example 1", "path": "example_1", "icon": "layout-grid", "content": None},
    {"name": "Example 2", "path": "example_2", "icon": "layout-grid", "content": None},
    {"name": "Example 3", "path": "example_3", "icon": "layout-grid", "content": None},
]


@router.get("/user/metadata.json")
async def users_metadata() -> dict[str, list[dict[str, str | None]]]:
    """Return the example page metadata document for the users view."""

    example_page = Page(PAGES / "example.xml")
    example_page.validate()
    page_content = example_page.content

    return {"pages": [{**page, "content": page_content} for page in USER_PAGES]}
