from src import auth
from uuid import UUID
from fastapi import APIRouter
from src.models.users import UserOrganizationMembership
from src.models.resources import OrganizationIdentity
from src.database.services import organizations
from src.models.organizations import OrganizationCreate
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization

router = APIRouter()


@router.get("/organizations/{organization_id}", response_model=UserOrganizationMembership)
async def get_organization(session: auth.Session, user: auth.CurrentUser, organization_id: UUID) -> UserOrganization:
    """Return the current user's membership for one Organization UUID."""

    # Resolve the route UUID within the authenticated user's active memberships.
    return await organizations.membership_by_id(session, user.id, organization_id)


@router.post("/organizations", response_model=OrganizationIdentity, status_code=202)
async def create_organization(session: auth.Session, user: auth.CurrentUser, payload: OrganizationCreate) -> Organization:
    """Create Organization desired state and queue infrastructure creation."""

    # Persist the Organization with transactionally selected infrastructure registries.
    organization = await organizations.create(session, payload.name, user)
    await session.commit()
    return organization


@router.delete("/organizations/{organization_id}", status_code=202, response_model=OrganizationIdentity)
async def delete_organization(session: auth.Session, user: auth.CurrentUser, organization_id: UUID) -> Organization:
    """Mark one Organization absent and queue lifecycle cleanup."""

    # Tombstone the Organization only after the service revalidates current ownership under its resource lock.
    result = await organizations.soft_delete(session, organization_id, user)
    await session.commit()
    return result
