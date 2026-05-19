import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser

router = APIRouter(prefix="/api")


@router.get("/user/metadata.json")
async def users_metadata() -> dict[str, str]:
    """Return the metadata document for the users view."""

    return {"name": "Users"}


@router.get("/user/organizations")
async def user_organizations(user: db.User = Depends(authuser)) -> dict[str, list[dict[str, str]]]:
    """Return the organizations visible to the current user."""

    organizations = await db.organizations.list()
    return {"items": [{"name": organization.name} for organization in organizations]}
