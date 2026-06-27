from uuid import UUID
from fastapi import Request
from sqlmodel import select
from src.errors import NotFoundError, ForbiddenError, UnauthorizedError
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.session import session_scope
from src.models.organizations import OrganizationDetails
from src.database.models.users import User
from src.database.services.users import users
from src.database.models.association import UserOrganization
from src.database.services.organizations import organizations
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

    organization = await organizations.get(organization_id)
    if organization is None:
        raise NotFoundError("Organization", organization_id)

    async with session_scope() as session:
        membership_result = await session.execute(
            select(UserOrganization).where(
                UserOrganization.user_id == user.id,
                UserOrganization.organization_id == organization_id,
                UserOrganization.deleted_at.is_(None),
            )
        )
        membership = membership_result.scalar_one_or_none()

    if membership is None:
        raise NotFoundError("Organization", organization_id)

    return organization
