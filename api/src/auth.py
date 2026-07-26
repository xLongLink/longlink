from uuid import UUID
from fastapi import Cookie, Depends, Request, HTTPException
from datetime import timedelta
from sqlmodel import col
from src.utils import roles, token
from sqlalchemy import select
from src.database import session as database
from collections.abc import AsyncIterator
from src.environments import env
from src.models.roles import PlatformRoles
from longlink.utils.time import utcnow
from src.database.services import users
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User, AccessToken


class SessionAccountsService:
    """Manage saved local accounts in one signed browser session."""

    def __init__(self, request: Request):
        """Store the request carrying the signed session state."""

        self.request = request

    def list(self) -> list[UUID]:
        """Return valid saved local user identifiers."""

        raw_accounts = self.request.session.get("account_ids", [])
        if not isinstance(raw_accounts, list):
            return []

        # Ignore malformed and duplicate identifiers from stale session cookies.
        accounts: list[UUID] = []
        for raw_account in raw_accounts:
            try:
                account = UUID(str(raw_account))
            except (TypeError, ValueError):
                continue
            if account not in accounts:
                accounts.append(account)
        return accounts

    def remember(self, user_id: UUID) -> None:
        """Save one account as the most recently authenticated account."""

        accounts = self.list()

        # Keep a bounded account list so the signed session cookie remains small.
        if user_id in accounts:
            accounts.remove(user_id)
        accounts.append(user_id)
        self.request.session["account_ids"] = [str(account) for account in accounts[-10:]]

    def remove(self, user_id: UUID) -> None:
        """Remove one account from the signed saved-account list."""

        accounts = self.list()

        # Persist the remaining account identifiers in their current order.
        if user_id in accounts:
            accounts.remove(user_id)
        self.request.session["account_ids"] = [str(account) for account in accounts]


async def get_auth_session() -> AsyncIterator[AsyncSession]:
    """Yield one database session for authentication dependencies and routes."""

    Session = await database.get_session()

    # Keep the session alive for the complete dependency request scope.
    async with Session() as session:
        yield session


async def current_optional_user_token(
    credential: str | None = Cookie(default=None, alias="longlink_auth"),
    session: AsyncSession = Depends(get_auth_session),
) -> tuple[User | None, str | None]:
    """Return the active user and credential for one valid optional browser session."""

    # Anonymous requests have no bearer credential to resolve.
    if credential is None:
        return None, None

    # Resolve only unexpired sessions belonging to active local accounts.
    cutoff = utcnow() - timedelta(seconds=env.AUTH_SESSION_LIFETIME_SECONDS)
    statement = (
        select(User)
        .join(AccessToken, col(AccessToken.user_id) == col(User.id))
        .where(
            col(AccessToken.token) == token.access_token_digest(credential),
            col(AccessToken.created_at) >= cutoff,
            col(User.deleted_at).is_(None),
        )
    )
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        return None, None
    return user, credential


async def current_authenticated_user(
    authentication: tuple[User | None, str | None] = Depends(current_optional_user_token),
) -> User:
    """Require and return one active authenticated LongLink user."""

    # Convert missing, expired, and revoked sessions into one stable authentication error.
    user, _ = authentication
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def authuser(authenticated: User = Depends(current_authenticated_user)) -> User:
    """Load the authenticated user with current LongLink resource access."""

    user = await users.get(authenticated.id, include_access=True)

    # Reject stale or soft-deleted accounts after token authentication.
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def authadmin(user: User = Depends(current_authenticated_user)) -> User:
    """Authenticate a platform administrator."""

    # Only administrator accounts can continue past this check.
    if not roles.atleast(user.role, PlatformRoles.administrator):
        raise HTTPException(status_code=403, detail="Permission required")
    return user


async def authsupport(user: User = Depends(current_authenticated_user)) -> User:
    """Authenticate a support or administrator account."""

    # Only support-capable accounts can continue past this check.
    if not roles.atleast(user.role, PlatformRoles.support):
        raise HTTPException(status_code=403, detail="Permission required")
    return user
