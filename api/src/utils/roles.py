from uuid import UUID
from fastapi import HTTPException
from src.models.roles import (RoleName, PlatformRoles, ApplicationRoles, OrganizationRoles, PlatformRoleRanks, ApplicationRoleRanks,
                              OrganizationRoleRanks)
from src.database.models.users import User


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


def atleast(value: RoleName | None, required_role: RoleName) -> bool:
    """Raise unless one role is at least as privileged as the required role."""

    # Missing current roles never satisfy requirements.
    if value is None:
        raise HTTPException(status_code=403, detail="Permission required")

    # Compare roles only within the same scope.
    if type(value) is not type(required_role):
        raise HTTPException(status_code=403, detail="Permission required")

    # Enforce the minimum privilege rank.
    if rank(value) < rank(required_role):
        raise HTTPException(status_code=403, detail="Permission required")

    return True


def access(user: User, resource: UUID) -> bool:
    """Raise unless the user has loaded access to one organization or application."""

    # Organization memberships grant access to organization resources.
    for organization in user.organizations:
        if organization.deleted_at is None and organization.id == resource:
            return True

        # Organization membership grants base access to the organization's applications.
        for application in organization.applications:
            if application.deleted_at is None and application.id == resource:
                return True

    # Application memberships grant access to application resources.
    for application in user.applications:
        if application.deleted_at is None and application.id == resource:
            return True

    raise HTTPException(status_code=403, detail="Access required")
