import asyncio
import logging
import smtplib
from uuid import UUID
from typing import cast
from fastapi import Depends, Request, Response, HTTPException
from src.utils import roles
from src.database import session as database
from email.message import EmailMessage
from fastapi_users import UUIDIDMixin, FastAPIUsers, BaseUserManager, schemas
from collections.abc import AsyncIterator
from fastapi_users.db import SQLAlchemyUserDatabase
from src.environments import env
from src.models.roles import PlatformRoles
from fastapi.responses import RedirectResponse
from src.database.services import users
from httpx_oauth.exceptions import GetIdEmailError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_users.exceptions import InvalidPasswordException
from src.database.models.users import User, AccessToken, OAuthAccount
from httpx_oauth.clients.github import GitHubOAuth2
from httpx_oauth.clients.openid import OpenID
from fastapi_users.authentication import CookieTransport, AuthenticationBackend
from fastapi_users.authentication.strategy.db import DatabaseStrategy
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase

logger = logging.getLogger("longlink.auth")
AUTH_COOKIE = "longlink_auth"


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


class LongLinkUserDatabase(SQLAlchemyUserDatabase[User, UUID]):
    """Use FastAPI Users without retaining upstream provider credentials."""

    async def add_oauth_account(self, user: User, create_dict: dict[str, object]) -> User:
        """Persist provider identity while discarding access and refresh tokens."""

        sanitized = {**create_dict, "access_token": "", "refresh_token": None, "expires_at": None}
        return await super().add_oauth_account(user, sanitized)

    async def update_oauth_account(self, user: User, oauth_account: OAuthAccount, update_dict: dict[str, object]) -> User:
        """Refresh provider identity metadata without retaining credentials."""

        sanitized = {**update_dict, "access_token": "", "refresh_token": None, "expires_at": None}
        return await super().update_oauth_account(user, oauth_account, sanitized)


class VerifiedGitHubOAuth2(GitHubOAuth2):
    """Require GitHub to return a verified account email."""

    async def get_id_email(self, token: str) -> tuple[str, str | None]:
        """Return the GitHub account ID and a verified email address."""

        account_id, email = await super().get_id_email(token)
        emails = await self.get_emails(token)

        # Accept only the exact address GitHub reports as verified.
        if email is None or not any(item.get("email") == email and item.get("verified") is True for item in emails):
            raise GetIdEmailError("GitHub returned no verified email address")
        return account_id, email


class OAuthCookieTransport(CookieTransport):
    """Set the normal auth cookie and return OAuth callbacks to the web frontend."""

    async def get_login_response(self, token: str) -> RedirectResponse:
        """Return a frontend redirect carrying the new authentication cookie."""

        response = RedirectResponse(f"{env.PUBLIC_URL.rstrip('/')}/auth/complete", status_code=302)
        return cast(RedirectResponse, self._set_login_cookie(response, token))


async def get_auth_session() -> AsyncIterator[AsyncSession]:
    """Yield one database session for FastAPI Users dependencies."""

    Session = await database.get_session()

    # Keep the session alive for the complete dependency request scope.
    async with Session() as session:
        yield session


async def get_user_database(session: AsyncSession = Depends(get_auth_session)) -> AsyncIterator[LongLinkUserDatabase]:
    """Yield the FastAPI Users adapter for LongLink user models."""

    yield LongLinkUserDatabase(session, User, OAuthAccount)  # pyright: ignore[reportArgumentType]


async def get_access_token_database(
    session: AsyncSession = Depends(get_auth_session),
) -> AsyncIterator[SQLAlchemyAccessTokenDatabase[AccessToken]]:
    """Yield the database adapter for revocable browser access tokens."""

    yield SQLAlchemyAccessTokenDatabase(session, AccessToken)


def send_smtp_message(message: EmailMessage) -> None:
    """Send one prepared authentication message through configured SMTP."""

    if env.SMTP_HOST is None:
        raise RuntimeError("SMTP_HOST is not configured")

    # Open the configured SMTP transport and upgrade it with STARTTLS when requested.
    smtp_type = smtplib.SMTP_SSL if env.SMTP_USE_TLS else smtplib.SMTP
    with smtp_type(env.SMTP_HOST, env.SMTP_PORT, timeout=15) as client:
        if env.SMTP_START_TLS:
            client.starttls()
        if env.SMTP_USERNAME is not None:
            client.login(env.SMTP_USERNAME, env.SMTP_PASSWORD or "")
        client.send_message(message)


async def send_authentication_email(recipient: str, subject: str, body: str) -> None:
    """Deliver an authentication email or log it during local development."""

    # Keep local development self-contained when no SMTP server is configured.
    if env.SMTP_HOST is None and env.DEVELOPMENT:
        logger.warning("Development authentication email to %s: %s\n%s", recipient, subject, body)
        return

    message = EmailMessage()
    message["From"] = env.SMTP_FROM
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    # SMTP is synchronous, so isolate it from the API event loop.
    await asyncio.to_thread(send_smtp_message, message)


class UserManager(UUIDIDMixin, BaseUserManager[User, UUID]):
    """Connect FastAPI Users lifecycle events to LongLink account policy."""

    reset_password_token_secret = env.SESSION_KEY
    verification_token_secret = env.SESSION_KEY

    async def validate_password(self, password: str, user: schemas.BaseUserCreate | User) -> None:
        """Require a practical minimum password length."""

        if len(password) < 12:
            raise InvalidPasswordException(reason="Password must contain at least 12 characters")
        if len(password) > 1024:
            raise InvalidPasswordException(reason="Password cannot exceed 1024 characters")

    async def on_after_register(self, user: User, request: Request | None = None) -> None:
        """Complete local profile defaults and start email verification."""

        updates: dict[str, object] = {}
        if not user.name:
            updates["name"] = user.email.split("@", 1)[0]
        if env.INITIAL_ADMIN_EMAIL is not None and user.email.casefold() == env.INITIAL_ADMIN_EMAIL.casefold():
            updates["role"] = PlatformRoles.administrator
            updates["is_superuser"] = True

        # Persist derived profile and bootstrap state before exposing the account.
        if updates:
            user = await self.user_db.update(user, updates)

        # OAuth providers can establish verified email ownership during callback.
        if not user.is_verified:
            await self.request_verify(user, request)

    async def on_after_request_verify(self, user: User, token: str, request: Request | None = None) -> None:
        """Send the email verification link generated by FastAPI Users."""

        url = f"{env.PUBLIC_URL.rstrip('/')}/auth/verify-email?token={token}"
        await send_authentication_email(user.email, "Verify your LongLink account", f"Verify your account:\n\n{url}\n")

    async def on_after_forgot_password(self, user: User, token: str, request: Request | None = None) -> None:
        """Send the password reset link generated by FastAPI Users."""

        url = f"{env.PUBLIC_URL.rstrip('/')}/auth/reset-password?token={token}"
        await send_authentication_email(user.email, "Reset your LongLink password", f"Reset your password:\n\n{url}\n")

    async def on_after_login(self, user: User, request: Request | None = None, response: Response | None = None) -> None:
        """Remember the local account for the browser account switcher."""

        if request is not None:
            SessionAccountsService(request).remember(user.id)


async def get_user_manager(user_database: LongLinkUserDatabase = Depends(get_user_database)) -> AsyncIterator[UserManager]:
    """Yield the configured LongLink user manager."""

    yield UserManager(user_database)


cookie_transport = CookieTransport(
    cookie_name=AUTH_COOKIE,
    cookie_max_age=env.AUTH_SESSION_LIFETIME_SECONDS,
    cookie_secure=not env.DEVELOPMENT,
    cookie_httponly=True,
    cookie_samesite="lax",
)
oauth_cookie_transport = OAuthCookieTransport(
    cookie_name=AUTH_COOKIE,
    cookie_max_age=env.AUTH_SESSION_LIFETIME_SECONDS,
    cookie_secure=not env.DEVELOPMENT,
    cookie_httponly=True,
    cookie_samesite="lax",
)


def get_database_strategy(
    access_tokens: SQLAlchemyAccessTokenDatabase[AccessToken] = Depends(get_access_token_database),
) -> DatabaseStrategy[User, UUID, AccessToken]:
    """Return the revocable database-token authentication strategy."""

    return DatabaseStrategy(access_tokens, lifetime_seconds=env.AUTH_SESSION_LIFETIME_SECONDS)


cookie_backend = AuthenticationBackend(name="cookie", transport=cookie_transport, get_strategy=get_database_strategy)
oauth_cookie_backend = AuthenticationBackend(name="oauth_cookie", transport=oauth_cookie_transport, get_strategy=get_database_strategy)
fastapi_users = FastAPIUsers[User, UUID](get_user_manager, [cookie_backend])
current_active_verified_user = fastapi_users.current_user(active=True, verified=True)
current_optional_user_token = fastapi_users.authenticator.current_user_token(optional=True)

github_oauth_client = (
    VerifiedGitHubOAuth2(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, scopes=["read:user", "user:email"])
    if env.GITHUB_CLIENT_ID is not None and env.GITHUB_CLIENT_SECRET is not None
    else None
)
oidc_oauth_client = (
    OpenID(
        env.OIDC_CLIENT_ID,
        env.OIDC_CLIENT_SECRET,
        f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration",
        name="oidc",
        base_scopes=["openid", "profile", "email"],
    )
    if env.OIDC_ISSUER is not None and env.OIDC_CLIENT_ID is not None and env.OIDC_CLIENT_SECRET is not None
    else None
)


async def authuser(authenticated: User = Depends(current_active_verified_user)) -> User:
    """Load the authenticated user with current LongLink resource access."""

    user = await users.get(authenticated.id, include_access=True)

    # Reject stale or soft-deleted accounts after token authentication.
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def authadmin(user: User = Depends(authuser)) -> User:
    """Authenticate a platform administrator."""

    # Only administrator accounts can continue past this check.
    if not roles.atleast(user.role, PlatformRoles.administrator):
        raise HTTPException(status_code=403, detail="Permission required")
    return user


async def authsupport(user: User = Depends(authuser)) -> User:
    """Authenticate a support or administrator account."""

    # Only support-capable accounts can continue past this check.
    if not roles.atleast(user.role, PlatformRoles.support):
        raise HTTPException(status_code=403, detail="Permission required")
    return user
