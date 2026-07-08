from uuid import UUID
from dataclasses import dataclass
from fastapi import Depends
from src.auth import authuser
from src.errors import NotFoundError
from src.models.roles import OrganizationRoles
from src.database.models.users import User
from src.database.models.organizations import Organization
from src.database.services import organizations


@dataclass(frozen=True)
class OrganizationAccess:
    """Represent authenticated access to one organization."""

    user: User
    role: OrganizationRoles
    organization: Organization


async def organization_access(organization_id: UUID, user: User = Depends(authuser)) -> OrganizationAccess:
    """Return the current user's organization and membership role."""

    # Load the membership row and organization together so all callers use one access path.
    member_access = await organizations.get_member_access(organization_id, user.id)
    if member_access is None:
        raise NotFoundError("Organization", organization_id)

    organization, organization_role = member_access
    return OrganizationAccess(user=user, role=organization_role, organization=organization)
