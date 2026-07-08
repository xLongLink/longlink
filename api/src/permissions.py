from uuid import UUID
from dataclasses import dataclass
from fastapi import Depends
from src.auth import authuser
from src.errors import NotFoundError, ForbiddenError
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.database.models.users import User
from src.database.models.applications import Application
from src.database.models.organizations import Organization
from src.database.services import applications, organizations


@dataclass(frozen=True)
class OrganizationAccess:
    """Represent authenticated access to one organization."""

    user: User
    role: OrganizationRoles
    organization: Organization

APPLICATION_ACCESS_ORGANIZATION_ROLES = {
    OrganizationRoles.admin,
    OrganizationRoles.maintain,
    OrganizationRoles.owner,
}
APPLICATION_MANAGEMENT_ROLES = {ApplicationRoles.admin, ApplicationRoles.maintain}
APPLICATION_ROLE_RANKS = {
    ApplicationRoles.read: 1,
    ApplicationRoles.write: 2,
    ApplicationRoles.maintain: 3,
    ApplicationRoles.admin: 4,
}
ORGANIZATION_APPLICATION_ROLE_RANKS = {
    OrganizationRoles.maintain: 3,
    OrganizationRoles.admin: 4,
    OrganizationRoles.owner: 5,
}
ORGANIZATION_INVITATION_ROLES = {
    OrganizationRoles.admin,
    OrganizationRoles.maintain,
    OrganizationRoles.owner,
}
ORGANIZATION_MEMBER_MANAGEMENT_ROLES = {OrganizationRoles.admin, OrganizationRoles.owner}
ORGANIZATION_RESOURCE_INSPECTION_ROLES = {
    OrganizationRoles.admin,
    OrganizationRoles.maintain,
    OrganizationRoles.owner,
}
ORGANIZATION_ROLE_RANKS = {
    OrganizationRoles.read: 1,
    OrganizationRoles.write: 2,
    OrganizationRoles.maintain: 3,
    OrganizationRoles.admin: 4,
    OrganizationRoles.owner: 5,
}
PROXY_METHOD_REQUIRED_ROLES = {
    "GET": "read",
    "HEAD": "read",
    "OPTIONS": "read",
    "POST": "write",
    "PUT": "write",
    "PATCH": "write",
    "DELETE": "maintain",
}
RUNTIME_ROLE_RANKS = {
    "read": 1,
    "write": 2,
    "maintain": 3,
    "admin": 4,
    "owner": 5,
}


async def application_access_roles(
    application: Application, user: User
) -> tuple[OrganizationRoles | None, ApplicationRoles | None]:
    """Return organization and application roles for one user/application pair."""

    organization_role = await organizations.membership_role(application.organization_id, user.id)
    application_role = await applications.membership_role(application.id, user.id)
    return organization_role, application_role


async def organization_member(organization_id: UUID, user: User = Depends(authuser)) -> OrganizationAccess:
    """Return the current user's organization and membership role."""

    member_access = await organizations.get_member_access(organization_id, user.id)
    if member_access is None:
        raise NotFoundError("Organization", organization_id)

    organization, role = member_access
    return OrganizationAccess(user=user, role=role, organization=organization)


def application_role_rank(role: ApplicationRoles | None) -> int:
    """Return the comparable privilege rank for an application role."""

    if role is None:
        return 0

    return APPLICATION_ROLE_RANKS[role]


def application_manager_role_rank(
    organization_role: OrganizationRoles | None,
    application_role: ApplicationRoles | None,
) -> int:
    """Return the strongest application role rank the caller may manage."""

    organization_role_rank = 0
    if organization_role is not None and organization_role in ORGANIZATION_APPLICATION_ROLE_RANKS:
        organization_role_rank = ORGANIZATION_APPLICATION_ROLE_RANKS[organization_role]

    return max(application_role_rank(application_role), organization_role_rank)


def can_create_application(organization_role: OrganizationRoles | None) -> bool:
    """Return whether one organization role may create applications."""

    return organization_role in APPLICATION_ACCESS_ORGANIZATION_ROLES


def can_create_organization_invitation(organization_role: OrganizationRoles | None) -> bool:
    """Return whether one organization role may invite members."""

    return organization_role in ORGANIZATION_INVITATION_ROLES


def can_delete_organization(organization_role: OrganizationRoles | None) -> bool:
    """Return whether one organization role may delete the organization."""

    return organization_role == OrganizationRoles.owner


def can_inspect_organization_resources(organization_role: OrganizationRoles | None) -> bool:
    """Return whether one organization role may inspect managed resources."""

    return organization_role in ORGANIZATION_RESOURCE_INSPECTION_ROLES


def can_manage_application(
    organization_role: OrganizationRoles | None,
    application_role: ApplicationRoles | None,
) -> bool:
    """Return whether a user may perform application management actions."""

    return application_role in APPLICATION_MANAGEMENT_ROLES or organization_role in APPLICATION_ACCESS_ORGANIZATION_ROLES


def can_manage_organization_members(organization_role: OrganizationRoles | None) -> bool:
    """Return whether one organization role may manage members."""

    return organization_role in ORGANIZATION_MEMBER_MANAGEMENT_ROLES


def can_manage_organization_owner_role(organization_role: OrganizationRoles | None) -> bool:
    """Return whether one organization role may manage owner assignments."""

    return organization_role == OrganizationRoles.owner


def can_view_application_logs(
    organization_role: OrganizationRoles | None,
    application_role: ApplicationRoles | None,
) -> bool:
    """Return whether a user may view application logs."""

    return can_manage_application(organization_role, application_role)


def effective_runtime_role(
    organization_role: OrganizationRoles | None,
    application_role: ApplicationRoles | None,
) -> str | None:
    """Return the strongest role the application runtime should see."""

    roles: list[str] = []

    # Application roles are the normal runtime grant for application members.
    if application_role is not None:
        roles.append(application_role.value)

    # Elevated organization roles can open and operate runtimes without per-app grants.
    if organization_role is not None and organization_role in APPLICATION_ACCESS_ORGANIZATION_ROLES:
        roles.append(organization_role.value)

    if not roles:
        return None

    return max(roles, key=lambda role: RUNTIME_ROLE_RANKS[role])


def organization_role_rank(role: OrganizationRoles | None) -> int:
    """Return the comparable privilege rank for an organization role."""

    if role is None:
        return 0

    return ORGANIZATION_ROLE_RANKS[role]


def require_proxy_method_role(method: str, runtime_role: str) -> None:
    """Require a runtime role that allows the proxied HTTP method."""

    required_role = PROXY_METHOD_REQUIRED_ROLES.get(method.upper(), "maintain")

    # Enforce the same method-level policy before requests reach the app container.
    if RUNTIME_ROLE_RANKS[runtime_role] < RUNTIME_ROLE_RANKS[required_role]:
        raise ForbiddenError(f"Application {required_role} access required")


def is_organization_owner_role(organization_role: OrganizationRoles | None) -> bool:
    """Return whether one organization role is owner."""

    return organization_role == OrganizationRoles.owner
