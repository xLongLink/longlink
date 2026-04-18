from fastapi import APIRouter
from longlink.utils import Organization, organization

router = APIRouter()


@router.put('/organization')
@router.post('/organization')
async def update_organization_settings(payload: Organization) -> Organization:
    """Synchronize organization settings with in-memory organization state."""
    updated_settings = payload.model_dump()

    # Mirror payload fields into shared organization settings singleton.
    for key, value in updated_settings.items():
        setattr(organization, key, value)

    return organization
