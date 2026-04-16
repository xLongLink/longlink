import src.db as db
import src.utils.apps
from src.config import OrganizationSettings
from src.router import router


@router.get("/organization")
async def get_organization() -> OrganizationSettings:
    return await db.settings.get_organization()


@router.put("/organization")
async def update_organization(payload: OrganizationSettings) -> OrganizationSettings:
    await db.settings.save_organization(payload)
    await src.utils.apps.org()
    return payload
