from uuid import UUID
from src.models.roles import OrganizationRoles
from src.database.models.users import User
from src.database.models.association import UserOrganization

ROLE_RANKS = {role: index for index, role in enumerate(OrganizationRoles, start=1)}


def rank(value: OrganizationRoles | None) -> int:
    """Return the numeric rank for one Organization role."""

    # Missing roles have no privileges in any role scope.
    if value is None:
        return 0

    return ROLE_RANKS[value]


def atleast(value: OrganizationRoles | None, required_role: OrganizationRoles) -> bool:
    """Return whether one Organization role satisfies the required role."""

    # Enforce the minimum privilege rank.
    return rank(value) >= rank(required_role)


def access(user: User, organization_id: UUID) -> UserOrganization | None:
    """Return the organization membership that grants access."""

    # Organization memberships grant access to organization resources.
    for membership in user.organization_memberships:
        if membership.organization.deleted_at is None and membership.organization_id == organization_id:
            return membership

    return None
