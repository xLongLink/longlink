from fastapi import HTTPException
from src.models.roles import (
    RoleName,
    PlatformRoles,
    ApplicationRoles,
    PlatformRoleRanks,
    OrganizationRoles,
    ApplicationRoleRanks,
    OrganizationRoleRanks,
)


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


def atleast(value: RoleName | None, required_role: RoleName, detail: str = "Permission required") -> bool:
    """Raise unless one role is at least as privileged as the required role."""

    # Missing current roles never satisfy requirements.
    if value is None:
        raise HTTPException(status_code=403, detail=detail)

    # Compare roles only within the same scope.
    if type(value) is not type(required_role):
        raise HTTPException(status_code=403, detail=detail)

    # Enforce the minimum privilege rank.
    if rank(value) < rank(required_role):
        raise HTTPException(status_code=403, detail=detail)

    return True
