import src.db as db
import src.utils.apps
from fastapi import APIRouter
from src.config import OrganizationSettings

router = APIRouter()


@router.get("/organization")
async def get_organization() -> OrganizationSettings:
    """Return organization settings."""
    return await db.settings.get_organization()


@router.put("/organization")
async def update_organization(payload: OrganizationSettings) -> OrganizationSettings:
    """Update organization settings and notify all apps."""
    await db.settings.save_organization(payload)
    await src.utils.apps.org()
    return payload
