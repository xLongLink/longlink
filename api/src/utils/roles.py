from uuid import UUID
from fastapi import HTTPException
from src.models.roles import (RoleName, PlatformRoles, ApplicationRoles, OrganizationRoles, PlatformRoleRanks, ApplicationRoleRanks,
                              OrganizationRoleRanks)
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization


def rank(value: RoleName | None) -> int:
    """Return the numeric rank for one role within its own role scope."""

    # Missing roles have no privileges in any role scope.
    if value is None:
        return 0

    # Platform, organization, and application role enums resolve through their matching rank enum.
    if type(value) is PlatformRoles:
        return PlatformRoleRanks[value.name].value

    # Organization roles resolve through organization ranks.
    if type(value) is OrganizationRoles:
        return OrganizationRoleRanks[value.name].value

    # Application roles resolve through application ranks.
    if type(value) is ApplicationRoles:
        return ApplicationRoleRanks[value.name].value

    raise ValueError(f"Unknown role '{value}'")


def atleast(value: RoleName | None, required_role: RoleName, *alternatives: tuple[RoleName | None, RoleName]) -> bool:
    """Raise unless one role satisfies its required role."""

    # Accept the first role requirement that matches scope and rank.
    for current_role, minimum_role in ((value, required_role), *alternatives):
        if current_role is None:
            continue

        if type(current_role) is not type(minimum_role):
            continue

        if rank(current_role) >= rank(minimum_role):
            return True

    raise HTTPException(status_code=403, detail="Permission required")


def access(user: User, resource: UUID) -> UserOrganization | UserApplication:
    """Return the loaded membership that grants access to one organization or application."""

    # Organization memberships grant access to organization resources.
    for membership in user.organization_memberships:
        if membership.organization.deleted_at is None and membership.organization_id == resource:
            return membership

    # Application memberships grant access to application resources.
    for membership in user.application_memberships:
        if membership.application.deleted_at is None and membership.application_id == resource:
            return membership

    # Organization membership grants base access to the organization's applications.
    for membership in user.organization_memberships:
        for application in membership.organization.applications:
            if application.deleted_at is None and application.id == resource:
                return membership

    raise HTTPException(status_code=403, detail="Access required")
