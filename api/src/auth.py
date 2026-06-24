from uuid import UUID
from fastapi import Request
from src.errors import ForbiddenError, NotFoundError, UnauthorizedError
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.models.users import User
from src.database.models.organizations import Organization
from src.database.services.organizations import organizations
from src.database.services.users import users
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
oauth.register(
    name="oidc",
    client_id=env.OIDC_CLIENT_ID,
    client_secret=env.OIDC_CLIENT_SECRET,
    server_metadata_url=f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration",
    client_kwargs={"scope": "openid profile email"},
)


async def authuser(request: Request) -> User:
    """Authenticate a user from session and return the User object."""

    oidc = request.session.get("oidc")
    if oidc is None:
        raise UnauthorizedError("Not authenticated")

    user = await users.get(oidc)
    if not user:
        raise UnauthorizedError("Not authenticated")
    return user


async def authadmin(request: Request) -> User:
    """Authenticate an admin user from session and return the User object."""

    user = await authuser(request)

    # Only administrator accounts can continue past this check.
    if user.role != PlatformRoles.administrator:
        raise ForbiddenError("Administrator privileges required")

    return user


async def authsupport(request: Request) -> User:
    """Authenticate a support or administrator user from session."""

    user = await authuser(request)

    if user.role not in {PlatformRoles.support, PlatformRoles.administrator}:
        raise ForbiddenError("Support access required")

    return user


async def organization_access(organization_id: UUID, user: User) -> Organization:
    """Return one organization after verifying the user belongs to it."""

    organization = await organizations.get(organization_id)
    if organization is None:
        raise NotFoundError("Organization", organization_id)

    if not any(member.id == organization_id for member in user.organizations):
        raise NotFoundError("Organization", organization_id)

    return organization
