from fastapi import APIRouter
from longlink.utils.organization import OrganizationSettings, org

organization_router = APIRouter()


@organization_router.post('/organization')
@organization_router.put('/organization')
async def update_organization_settings(payload: OrganizationSettings) -> OrganizationSettings:
    """Synchronize organization settings with in-memory organization state."""

    updated_settings = payload.model_dump()

    # Mirror payload fields into shared organization settings singleton.
    for key, value in updated_settings.items():
        setattr(org, key, value)

    return org
