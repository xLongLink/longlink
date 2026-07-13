from uuid import UUID
from typing import Literal, overload
from src.models.roles import RoleName, Ranks, PlatformRoles, ApplicationRoles, OrganizationRoles, PlatformRoleRanks
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization

AccessMembership = UserOrganization | UserApplication


def rank(value: RoleName | None) -> int:
    """Return the numeric rank for one role within its own role scope."""

    # Missing roles have no privileges in any role scope.
    if value is None:
        return 0

    role_type = type(value)

    # Platform roles resolve through their own rank scale.
    if role_type is PlatformRoles:
        return PlatformRoleRanks[value.name].value

    # Organization and application roles share the same rank scale.
    if role_type in {OrganizationRoles, ApplicationRoles}:
        return Ranks[value.name].value

    raise ValueError(f"Unknown role '{value}'")


def atleast(value: RoleName | None, required_role: RoleName) -> bool:
    """Return whether one role satisfies the required role."""

    # Missing or cross-scope roles never satisfy requirements.
    if value is None or type(value) is not type(required_role):
        return False

    # Enforce the minimum privilege rank.
    return rank(value) >= rank(required_role)


@overload
def access(user: User, resource: UUID) -> AccessMembership | None:
    """Return the membership that grants access across supported scopes."""

    ...


@overload
def access(user: User, resource: UUID, scope: Literal["organization"]) -> UserOrganization | None:
    """Return the organization membership that grants access."""

    ...


@overload
def access(user: User, resource: UUID, scope: Literal["application"]) -> AccessMembership | None:
    """Return the application or organization membership that grants access."""

    ...


@overload
def access(user: User, resource: UUID, scope: None) -> AccessMembership | None:
    """Return the membership that grants access across supported scopes."""

    ...


def access(
    user: User,
    resource: UUID,
    scope: Literal["organization", "application"] | None = None,
) -> UserOrganization | UserApplication | None:
    """Return the loaded membership that grants access, or none when access is missing."""

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

    return None
