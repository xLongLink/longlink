from uuid import UUID
from typing import Literal, overload
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


def atleast(value: RoleName | None, required_role: RoleName, raise_error: bool = True) -> bool:
    """Return whether one role satisfies the required role, raising by default."""

    # Missing or cross-scope roles never satisfy requirements.
    if value is None or type(value) is not type(required_role):
        if raise_error:
            raise HTTPException(status_code=403, detail="Permission required")

        return False

    # Enforce the minimum privilege rank.
    if rank(value) >= rank(required_role):
        return True

    if raise_error:
        raise HTTPException(status_code=403, detail="Permission required")

    return False


@overload
def access(user: User, resource: UUID, scope: Literal["organization"]) -> UserOrganization: ...


@overload
def access(user: User, resource: UUID, scope: Literal["application"]) -> UserOrganization | UserApplication: ...


@overload
def access(user: User, resource: UUID, scope: None = None) -> UserOrganization | UserApplication: ...


def access(user: User, resource: UUID, scope: Literal["organization", "application"] | None = None) -> UserOrganization | UserApplication:
    """Return the loaded membership that grants access to one organization or application."""

    # Organization memberships grant access to organization resources.
    if scope in {None, "organization"}:
        for membership in user.organization_memberships:
            if membership.organization.deleted_at is None and membership.organization_id == resource:
                return membership

    # Application memberships grant access to application resources.
    if scope in {None, "application"}:
        for membership in user.application_memberships:
            if (
                membership.organization.deleted_at is None
                and membership.application.deleted_at is None
                and membership.application_id == resource
            ):
                return membership

        # Organization membership grants base access to the organization's applications.
        for membership in user.organization_memberships:
            if membership.organization.deleted_at is not None:
                continue

            for application in membership.organization.applications:
                if application.deleted_at is None and application.id == resource:
                    return membership

    raise HTTPException(status_code=403, detail="Access required")
