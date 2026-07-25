import jwt
import hmac
import hashlib
import secrets
from uuid import UUID
from fastapi import Cookie, Depends, Request, Response, HTTPException
from datetime import timedelta
from sqlmodel import col
from src.utils import roles
from sqlalchemy import delete, select
from dataclasses import dataclass
from src.database import session as database
from collections.abc import AsyncIterator
from src.environments import env
from src.models.roles import PlatformRoles
from longlink.utils.time import utcnow
from src.database.services import users
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User, AccessToken

AUTH_COOKIE = "longlink_auth"
REGISTRATION_COOKIE = "longlink_registration"
PASSWORD_RESET_COOKIE = "longlink_password_reset"
JWT_ALGORITHM = "HS256"
REGISTRATION_TOKEN_AUDIENCE = "longlink:register"
PASSWORD_RESET_TOKEN_AUDIENCE = "longlink:reset-password"
REGISTRATION_TOKEN_LIFETIME_SECONDS = 3600
PASSWORD_RESET_TOKEN_LIFETIME_SECONDS = 3600
PASSWORD_RESET_COOKIE_LIFETIME_SECONDS = 900


class InvalidAuthToken(Exception):
    """Indicate that an authentication proof is invalid or expired."""


@dataclass(frozen=True)
class RegistrationClaims:
    """Represent identity and navigation authenticated by a registration token."""

    email: str
    next_path: str


def access_token_digest(token: str) -> str:
    """Return the stored digest for one browser access token."""

    # Keep the database value deterministic while avoiding raw bearer-token storage.
    return hmac.new(env.SESSION_KEY.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).hexdigest()


def password_fingerprint(hashed_password: str) -> str:
    """Return the reset-token fingerprint for one current password hash."""

    # Bind reset proof to the current credential without exposing its reusable hash.
    message = f"password-reset:{hashed_password}".encode()
    return hmac.new(env.SESSION_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def create_registration_token(email: str, next_path: str) -> str:
    """Create one signed, expiring proof of email ownership."""

    # Normalize the only account identifier carried by the stateless registration token.
    normalized_email = email.strip().lower()
    return jwt.encode(
        {
            "email": normalized_email,
            "next": next_path,
            "aud": REGISTRATION_TOKEN_AUDIENCE,
            "exp": utcnow() + timedelta(seconds=REGISTRATION_TOKEN_LIFETIME_SECONDS),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def registration_claims(token: str) -> RegistrationClaims:
    """Return the identity and navigation carried by one registration token."""

    # Reject invalid, expired, or wrong-purpose tokens before account setup.
    try:
        data = jwt.decode(token, env.SESSION_KEY, audience=REGISTRATION_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise InvalidAuthToken() from exc

    email = data.get("email")
    next_path = data.get("next")
    if not isinstance(email, str) or not email or not isinstance(next_path, str):
        raise InvalidAuthToken()
    return RegistrationClaims(email=email, next_path=next_path)


def create_password_reset_token(user: User) -> str:
    """Create one signed password-reset proof bound to the current credential."""

    # Expire recovery proof quickly and invalidate it automatically after a password change.
    return jwt.encode(
        {
            "sub": str(user.id),
            "password_fingerprint": password_fingerprint(user.hashed_password),
            "aud": PASSWORD_RESET_TOKEN_AUDIENCE,
            "exp": utcnow() + timedelta(seconds=PASSWORD_RESET_TOKEN_LIFETIME_SECONDS),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


async def password_reset_user(session: AsyncSession, token: str) -> User:
    """Return the active user authenticated by one password-reset token."""

    # Decode and validate the reset credential before loading its account.
    try:
        data = jwt.decode(token, env.SESSION_KEY, audience=PASSWORD_RESET_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])
        raw_user_id = data.get("sub")
        fingerprint = data.get("password_fingerprint")
        if not isinstance(raw_user_id, str) or not isinstance(fingerprint, str):
            raise InvalidAuthToken()
        user_id = UUID(raw_user_id)
    except (jwt.PyJWTError, ValueError) as exc:
        raise InvalidAuthToken() from exc

    # Require an active account and the exact credential version that received the link.
    statement = select(User).where(col(User.id) == user_id, col(User.deleted_at).is_(None))
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None or not hmac.compare_digest(fingerprint, password_fingerprint(user.hashed_password)):
        raise InvalidAuthToken()
    return user


def set_auth_cookie(response: Response, token: str) -> None:
    """Publish one opaque authenticated browser session."""

    # Keep the bearer credential inaccessible to scripts and aligned with database expiry.
    response.set_cookie(
        AUTH_COOKIE,
        token,
        max_age=env.AUTH_SESSION_LIFETIME_SECONDS,
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


def clear_auth_cookie(response: Response) -> None:
    """Remove the authenticated browser session cookie."""

    # Match the session-cookie scope so browsers reliably remove the credential.
    response.delete_cookie(
        AUTH_COOKIE,
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


def set_registration_cookie(response: Response, token: str) -> None:
    """Store verified registration proof in a short-lived browser-only cookie."""

    # Restrict the credential to account setup endpoints and keep it inaccessible to scripts.
    response.set_cookie(
        REGISTRATION_COOKIE,
        token,
        max_age=REGISTRATION_TOKEN_LIFETIME_SECONDS,
        path="/api/auth/register",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


def clear_registration_cookie(response: Response) -> None:
    """Remove browser registration proof after account creation."""

    # Match the setup-cookie scope so browsers reliably remove the credential.
    response.delete_cookie(
        REGISTRATION_COOKIE,
        path="/api/auth/register",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


def set_password_reset_cookie(response: Response, token: str) -> None:
    """Store password reset proof in a short-lived browser-only cookie."""

    # Scope the bearer credential to password reset endpoints and hide it from scripts.
    response.set_cookie(
        PASSWORD_RESET_COOKIE,
        token,
        max_age=PASSWORD_RESET_COOKIE_LIFETIME_SECONDS,
        path="/api/auth/reset-password",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


def clear_password_reset_cookie(response: Response) -> None:
    """Remove browser password reset proof after password replacement."""

    # Match the reset-cookie scope so browsers reliably remove the credential.
    response.delete_cookie(
        PASSWORD_RESET_COOKIE,
        path="/api/auth/reset-password",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


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


def create_access_token(session: AsyncSession, user: User) -> str:
    """Stage one revocable browser session and return its opaque credential."""

    # Keep the raw token client-side and persist only the keyed lookup digest.
    token = secrets.token_urlsafe()
    session.add(AccessToken(token=access_token_digest(token), user_id=user.id))
    return token


async def revoke_access_token(session: AsyncSession, token: str) -> None:
    """Revoke one browser session by its opaque credential."""

    # Delete only the digest matching this browser's active credential.
    statement = delete(AccessToken).where(col(AccessToken.token) == access_token_digest(token))
    await session.execute(statement)


async def revoke_user_access_tokens(session: AsyncSession, user_id: UUID) -> None:
    """Revoke every browser session issued to one user."""

    # Password replacement invalidates every previously authenticated browser.
    statement = delete(AccessToken).where(col(AccessToken.user_id) == user_id)
    await session.execute(statement)


async def current_optional_user_token(
    token: str | None = Cookie(default=None, alias=AUTH_COOKIE),
    session: AsyncSession = Depends(get_auth_session),
) -> tuple[User | None, str | None]:
    """Return the active user and credential for one valid optional browser session."""

    # Anonymous requests have no bearer credential to resolve.
    if token is None:
        return None, None

    # Resolve only unexpired sessions belonging to active local accounts.
    cutoff = utcnow() - timedelta(seconds=env.AUTH_SESSION_LIFETIME_SECONDS)
    statement = (
        select(User)
        .join(AccessToken, col(AccessToken.user_id) == col(User.id))
        .where(
            col(AccessToken.token) == access_token_digest(token),
            col(AccessToken.created_at) >= cutoff,
            col(User.deleted_at).is_(None),
        )
    )
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        return None, None
    return user, token


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
