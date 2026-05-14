import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser

router = APIRouter(prefix="/api")


@router.get("/user/metadata.json")
async def users_metadata() -> dict[str, list[dict[str, str | None]]]:
    """Return the example page metadata document for the users view."""

    return {
        "pages": [
            {"name": "Overview", "path": "/pages/example.xml", "icon": "layout-grid"},
            {"name": "Organizations", "path": "/pages/organizations.xml", "icon": "layout-grid"},
            {"name": "Settings", "path": "/pages/example.xml", "icon": "layout-grid"},
            {"name": "Example", "path": "/pages/example.xml", "icon": "layout-grid"},
        ]
    }


@router.get("/user/organizations")
async def user_organizations(user: db.User = Depends(authuser)) -> dict[str, list[dict[str, str]]]:
    """Return the organizations visible to the current user."""

    organizations = await db.organizations.list()
    return {"items": [{"name": organization.name} for organization in organizations]}
