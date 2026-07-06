import sys
import httpx2
from uuid import UUID
from fastapi import Request
from src.errors import NotFoundError, ForbiddenError, UnauthorizedError
from src.environments import env
from src.models.roles import PlatformRoles
from src.models.organizations import OrganizationDetails
from src.database.models.users import User
from src.database.services import users
from src.database.models.organizations import Organization
from src.database.services import organizations

# Authlib imports the HTTP client as `httpx`; use the configured `httpx2` package instead.
sys.modules.setdefault("httpx", httpx2)
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
oauth.register(
    name="oidc",
    client_id=env.OIDC_CLIENT_ID,
    client_secret=env.OIDC_CLIENT_SECRET,
    server_metadata_url=f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration",
    client_kwargs={"scope": "openid profile email"},
)


class SessionAccountsService:
    """Manage saved session accounts for one request."""

    def __init__(self, request: Request):
        """Store the request that carries the session state."""

        self.request = request

    def active(self) -> str | None:
        """Return the current active OIDC subject from the session."""

        active_account = self.request.session.get("oidc")
        if isinstance(active_account, str):
            return active_account

        return None

    def list(self) -> list[str]:
        """Return the saved OIDC accounts from the session."""

        accounts = self.request.session.get("oidc_accounts", [])
        return accounts if isinstance(accounts, list) else []

    def activate(self, oidc: str) -> None:
        """Store an OIDC subject and make it the active account."""

        accounts = self.list()

        # Keep one ordered list of saved accounts with the active account at the end.
        if oidc in accounts:
            accounts.remove(oidc)

        accounts.append(oidc)
        self.request.session["oidc_accounts"] = accounts
        self.request.session["oidc"] = oidc

    def remove(self) -> None:
        """Remove the active account from the session and saved accounts."""

        active_account = self.active()
        accounts = self.list()

        if active_account in accounts:
            accounts.remove(active_account)
            self.request.session["oidc_accounts"] = accounts

        self.request.session.pop("oidc", None)

    def deactivate(self) -> None:
        """Clear the active account while keeping the saved account list."""

        self.request.session.pop("oidc", None)


async def authuser(request: Request) -> User:
    """Authenticate a user from session and return the User object."""

    oidc = SessionAccountsService(request).active()
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


async def organization_access(organization_id: UUID, user: User) -> OrganizationDetails:
    """Return one organization after verifying the user belongs to it."""

    await organization_member_access(organization_id, user)
    organization = await organizations.get(organization_id, application_user_id=user.id)
    if organization is None:
        raise NotFoundError("Organization", organization_id)

    return organization


async def organization_member_access(organization_id: UUID, user: User) -> Organization:
    """Return one lightweight organization after verifying membership."""

    organization = await organizations.get_member(organization_id, user.id)
    if organization is None:
        raise NotFoundError("Organization", organization_id)

    return organization
