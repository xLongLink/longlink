from uuid import UUID
from typing import Literal, overload
from dataclasses import dataclass
from src.models.roles import OrganizationRoles
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


@dataclass(frozen=True, slots=True)
class ApplicationAccess:
    """Represent inherited organization access to one active Application."""

    application: Application
    organization: Organization
    role: OrganizationRoles

def rank(value: OrganizationRoles | None) -> int:
    """Return the numeric rank for one Organization role."""

    # Missing roles have no privileges in any role scope.
    if value is None:
        return 0

    return list(OrganizationRoles).index(value) + 1


def atleast(value: OrganizationRoles | None, required_role: OrganizationRoles) -> bool:
    """Return whether one Organization role satisfies the required role."""

    # Missing roles have no Organization authority.
    if value is None:
        return False

    # Enforce the minimum privilege rank.
    return rank(value) >= rank(required_role)


@overload
def access(user: User, resource: UUID, scope: Literal["organization"]) -> UserOrganization | None:
    """Return the organization membership that grants access."""

    ...


@overload
def access(user: User, resource: UUID, scope: Literal["application"]) -> ApplicationAccess | None:
    """Return direct and inherited Application access."""

    ...


def access(user: User, resource: UUID, scope: Literal["organization", "application"]) -> UserOrganization | ApplicationAccess | None:
    """Return loaded Organization or Application access, or none when access is missing."""

    # Organization memberships grant access to organization resources.
    if scope == "organization":
        for membership in user.organization_memberships:
            if membership.organization.deleted_at is None and membership.organization_id == resource:
                return membership
        return None

    # Organization membership grants access to its active Applications.
    for membership in user.organization_memberships:
        if membership.organization.deleted_at is not None:
            continue

        for application in membership.organization.applications:
            if application.deleted_at is None and application.id == resource:
                return ApplicationAccess(
                    application=application,
                    organization=membership.organization,
                    role=membership.role,
                )

    return None
