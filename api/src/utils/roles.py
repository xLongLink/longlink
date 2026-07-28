from uuid import UUID
from typing import Literal, overload
from dataclasses import dataclass
from src.models.roles import Ranks, RoleName, OrganizationRoles
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

    def allows(self, required_role: OrganizationRoles) -> bool:
        """Return whether Organization authority permits an Application operation."""

        return atleast(self.role, required_role)


def rank(value: RoleName | None) -> int:
    """Return the numeric rank for one role within its own role scope."""

    # Missing roles have no privileges in any role scope.
    if value is None:
        return 0

    role_type = type(value)

    # Organization roles share one explicit privilege rank scale.
    if role_type is OrganizationRoles:
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
