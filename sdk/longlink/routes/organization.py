"""Organization synchronization routes."""

from longlink import post, put
from longlink.organization import OrganizationSettings, organization


@post('/organization')
@put('/organization')
async def update_organization_settings(payload: OrganizationSettings) -> OrganizationSettings:
    updated_settings = payload.model_dump()

    for key, value in updated_settings.items():
        setattr(organization, key, value)

    return organization
