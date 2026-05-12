from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/user/metadata.json")
async def users_metadata() -> dict[str, list[dict[str, str | None]]]:
    """Return the example page metadata document for the users view."""

    return {
        "pages": [
            {"name": "Example 1", "path": "/pages/example.xml", "icon": "layout-grid"},
            {"name": "Example 2", "path": "/pages/example.xml", "icon": "layout-grid"},
            {"name": "Example 3", "path": "/pages/example.xml", "icon": "layout-grid"},
        ]
    }
