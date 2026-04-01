from longlink.router import put, post
from longlink.organization import OrganizationSettings, org


@post('/organization')
@put('/organization')
async def update_organization_settings(payload: OrganizationSettings) -> OrganizationSettings:
    """Organization synchronization routes."""
    updated_settings = payload.model_dump()

    for key, value in updated_settings.items():
        setattr(org, key, value)

    return org
