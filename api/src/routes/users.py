from src.db import users as users_service
from fastapi import APIRouter
from src.routes.pages import get_all_pages

router = APIRouter(prefix="/api")


@router.get("/user/metadata.json")
async def users_metadata() -> dict[str, list[dict[str, str | None]]]:
    """Return the example page metadata document for the users view."""

    return {
        "pages": [
            {"name": "Example 1", "path": "example", "icon": "layout-grid", "content": None},
            {"name": "Example 2", "path": "example", "icon": "layout-grid", "content": None},
            {"name": "Example 3", "path": "example", "icon": "layout-grid", "content": None},
        ]
    }


@router.get("/user/pages/{page_name}")
async def get_user_page(page_name: str) -> dict[str, list[dict[str, str | None]]]:
    """Return the metadata for a specific user page."""

    pages = [page.model_dump() for page in get_all_pages() if page.path == page_name]
    return {"pages": pages}
