from src import auth
from uuid import UUID
from fastapi import Depends, APIRouter
from src.models.users import UserOrganizationMembership
from src.models.resources import OrganizationIdentity
from src.database.services import organizations
from src.models.organizations import OrganizationCreate

router = APIRouter(dependencies=[Depends(auth.authuser)])


@router.get("/organizations/slug/{organization_slug}", response_model=UserOrganizationMembership)
async def get_organization_by_slug(session: auth.Session, user: auth.CurrentUser, organization_slug: str):
    """Return the current user's membership for one Organization slug."""

    # Resolve the route slug within the authenticated user's active memberships.
    return await organizations.membership_by_slug(session, user.id, organization_slug)


@router.post("/organizations", response_model=OrganizationIdentity, status_code=202)
async def create_organization(session: auth.Session, user: auth.CurrentUser, payload: OrganizationCreate):
    """Create Organization desired state and queue infrastructure creation."""

    # Persist the Organization with transactionally selected infrastructure registries.
    organization = await organizations.create(session, payload.name, user)
    await session.commit()
    return organization


@router.delete("/organizations/{organization_id}", status_code=202, response_model=OrganizationIdentity)
async def delete_organization(session: auth.Session, user: auth.CurrentUser, organization_id: UUID):
    """Mark one Organization absent and queue lifecycle cleanup."""

    # Tombstone the Organization only after the service revalidates current ownership under its resource lock.
    result = await organizations.soft_delete(session, organization_id, user)
    await session.commit()
    return result
