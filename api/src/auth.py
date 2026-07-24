import jwt
import hmac
import hashlib
import secrets
from uuid import UUID
from typing import cast
from fastapi import Depends, Request, Response, HTTPException
from sqlmodel import col
from src.utils import mail, urls, roles
from sqlalchemy import delete
from dataclasses import dataclass
from src.database import session as database
from urllib.parse import urlencode
from fastapi_users import UUIDIDMixin, FastAPIUsers, BaseUserManager, schemas
from collections.abc import AsyncIterator
from fastapi_users.db import SQLAlchemyUserDatabase
from src.environments import env
from src.models.roles import PlatformRoles
from fastapi.responses import RedirectResponse
from fastapi_users.jwt import decode_jwt, generate_jwt
from src.database.services import users, invitations
from httpx_oauth.exceptions import GetIdEmailError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_users.exceptions import (InvalidID, UserInactive, UserNotExists, InvalidVerifyToken, InvalidPasswordException,
                                      InvalidResetPasswordToken)
from src.database.models.users import User, AccessToken, OAuthAccount
from httpx_oauth.clients.github import GitHubOAuth2
from fastapi_users.authentication import CookieTransport, AuthenticationBackend
from fastapi_users.authentication.strategy.db import DatabaseStrategy
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase

AUTH_COOKIE = "longlink_auth"
REGISTRATION_COOKIE = "longlink_registration"
PASSWORD_RESET_COOKIE = "longlink_password_reset"
REGISTRATION_TOKEN_AUDIENCE = "longlink:register"
REGISTRATION_TOKEN_LIFETIME_SECONDS = 3600
PASSWORD_RESET_COOKIE_LIFETIME_SECONDS = 900


@dataclass(frozen=True)
class RegistrationClaims:
    """Represent identity and navigation authenticated by a registration token."""

    email: str
    next_path: str


def access_token_digest(token: str) -> str:
    """Return the stored digest for one browser access token."""

    # Keep the database value deterministic while avoiding raw bearer-token storage.
    return hmac.new(env.SESSION_KEY.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).hexdigest()


def create_registration_token(email: str, next_path: str) -> str:
    """Create one signed, expiring proof of email ownership."""

    # Normalize the only account identifier carried by the stateless registration token.
    normalized_email = email.strip().lower()
    return generate_jwt(
        {"email": normalized_email, "next": next_path, "aud": REGISTRATION_TOKEN_AUDIENCE},
        env.SESSION_KEY,
        REGISTRATION_TOKEN_LIFETIME_SECONDS,
    )


def registration_claims(token: str) -> RegistrationClaims:
    """Return the identity and navigation carried by one registration token."""

    # Reject invalid, expired, or wrong-purpose tokens before account setup.
    try:
        data = decode_jwt(token, env.SESSION_KEY, [REGISTRATION_TOKEN_AUDIENCE])
    except jwt.PyJWTError as exc:
        raise InvalidVerifyToken() from exc

    email = data.get("email")
    next_path = data.get("next")
    if not isinstance(email, str) or not email or not isinstance(next_path, str):
        raise InvalidVerifyToken()
    return RegistrationClaims(email=email, next_path=next_path)


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


class LongLinkUserDatabase(SQLAlchemyUserDatabase[User, UUID]):
    """Use FastAPI Users without retaining upstream provider credentials."""

    async def create(self, create_dict: dict[str, object]) -> User:
        """Stage a user with one canonical case-insensitive email identity."""

        # Normalize OAuth and any future FastAPI Users creation path before uniqueness enforcement.
        email = create_dict.get("email")
        normalized = {**create_dict, "email": email.lower() if isinstance(email, str) else email}

        # Keep the user pending until provider-account creation commits both records.
        user = self.user_table(**normalized)
        self.session.add(user)
        await self.session.flush()
        return user

    async def add_oauth_account(self, user: User, create_dict: dict[str, object]) -> User:
        """Persist provider identity while discarding access and refresh tokens."""

        account_email = create_dict.get("account_email")
        sanitized = {
            **create_dict,
            "account_email": account_email.lower() if isinstance(account_email, str) else account_email,
            "access_token": "",
            "refresh_token": None,
            "expires_at": None,
        }
        return await super().add_oauth_account(user, sanitized)

    async def update_oauth_account(self, user: User, oauth_account: OAuthAccount, update_dict: dict[str, object]) -> User:
        """Refresh provider identity metadata without retaining credentials."""

        account_email = update_dict.get("account_email")
        sanitized = {
            **update_dict,
            "account_email": account_email.lower() if isinstance(account_email, str) else account_email,
            "access_token": "",
            "refresh_token": None,
            "expires_at": None,
        }
        return await super().update_oauth_account(user, oauth_account, sanitized)

    async def revoke_access_tokens(self, user_id: UUID) -> None:
        """Revoke every browser access token issued to one user."""

        # Password replacement invalidates all existing authenticated browser sessions.
        statement = delete(AccessToken).where(col(AccessToken.user_id) == user_id)
        await self.session.execute(statement)
        await self.session.commit()


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


class HashedDatabaseStrategy(DatabaseStrategy[User, UUID, AccessToken]):
    """Store only HMAC digests for revocable browser access tokens."""

    async def read_token(self, token: str | None, user_manager: BaseUserManager[User, UUID]) -> User | None:
        """Read one access token after hashing the browser cookie value."""

        # Anonymous requests have no cookie value to hash or load.
        if token is None:
            return None
        return await super().read_token(access_token_digest(token), user_manager)

    async def write_token(self, user: User) -> str:
        """Create one access token while storing only its digest."""

        # Keep the raw token client-side and persist only the lookup digest.
        token = secrets.token_urlsafe()
        await self.database.create({"token": access_token_digest(token), "user_id": user.id})
        return token

    async def destroy_token(self, token: str, user: User) -> None:
        """Destroy one access token after hashing the browser cookie value."""

        # Convert the bearer token to its stored database identity before deletion.
        await super().destroy_token(access_token_digest(token), user)


class UserManager(UUIDIDMixin, BaseUserManager[User, UUID]):
    """Connect FastAPI Users lifecycle events to LongLink account policy."""

    reset_password_token_secret = env.SESSION_KEY

    async def validate_reset_password_token(self, token: str) -> User:
        """Return the active user authenticated by a password reset token."""

        # Decode the signed credential with FastAPI Users' reset-token audience.
        try:
            data = decode_jwt(token, self.reset_password_token_secret, [self.reset_password_token_audience])
        except jwt.PyJWTError as exc:
            raise InvalidResetPasswordToken() from exc

        # Require both identity and password-version claims before loading the account.
        user_id = data.get("sub")
        password_fingerprint = data.get("password_fgpt")
        if not isinstance(user_id, str) or not isinstance(password_fingerprint, str):
            raise InvalidResetPasswordToken()
        try:
            parsed_id = self.parse_id(user_id)
        except InvalidID as exc:
            raise InvalidResetPasswordToken() from exc
        user = await self.get(parsed_id)

        # Match the current password hash so old and already-used reset tokens fail.
        valid_fingerprint, _ = self.password_helper.verify_and_update(user.hashed_password, password_fingerprint)
        if not valid_fingerprint:
            raise InvalidResetPasswordToken()
        if not user.is_active:
            raise UserInactive()
        return user

    async def validate_password(self, password: str, user: schemas.BaseUserCreate | User) -> None:
        """Require a practical minimum password length."""

        if len(password) < 12:
            raise InvalidPasswordException(reason="Password must contain at least 12 characters")
        if len(password) > 1024:
            raise InvalidPasswordException(reason="Password cannot exceed 1024 characters")

    async def on_after_register(self, user: User, request: Request | None = None) -> None:
        """Complete profile defaults after provider authentication."""

        updates: dict[str, object] = {}
        if not user.name:
            updates["name"] = user.email.split("@", 1)[0]
        if env.INITIAL_ADMIN_EMAIL is not None and user.email.lower() == env.INITIAL_ADMIN_EMAIL.lower():
            updates["role"] = PlatformRoles.administrator
            updates["is_superuser"] = True

        # Persist derived profile and bootstrap state after provider authentication.
        if updates:
            await self.user_db.update(user, updates)

    async def on_after_forgot_password(self, user: User, token: str, request: Request | None = None) -> None:
        """Send the password reset link generated by FastAPI Users."""

        # Carry only sanitized navigation in the query and keep the bearer credential in the fragment.
        requested_next = getattr(request.state, "password_reset_next", None) if request is not None else None
        next_path = urls.safe_local_path(requested_next, "/organizations")
        query = urlencode({"next": next_path})
        fragment = urlencode({"token": token})
        url = f"{env.PUBLIC_URL.rstrip('/')}/auth/reset-password?{query}#{fragment}"
        await mail.send_authentication_email(user.email, "Reset your LongLink password", f"Reset your password:\n\n{url}\n")

    async def on_after_reset_password(self, user: User, request: Request | None = None) -> None:
        """Revoke every existing browser session after password replacement."""

        # The configured user database owns the transaction used by this manager request.
        user_database = cast(LongLinkUserDatabase, self.user_db)
        await user_database.revoke_access_tokens(user.id)

    async def on_after_login(self, user: User, request: Request | None = None, response: Response | None = None) -> None:
        """Accept Organization invitations and remember the local browser account."""

        # Apply email-bound Organization access before the authenticated request continues.
        await invitations.accept(user)

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
) -> HashedDatabaseStrategy:
    """Return the revocable database-token authentication strategy."""

    return HashedDatabaseStrategy(access_tokens, lifetime_seconds=env.AUTH_SESSION_LIFETIME_SECONDS)


cookie_backend = AuthenticationBackend(name="cookie", transport=cookie_transport, get_strategy=get_database_strategy)
oauth_cookie_backend = AuthenticationBackend(name="oauth_cookie", transport=oauth_cookie_transport, get_strategy=get_database_strategy)
fastapi_users = FastAPIUsers[User, UUID](get_user_manager, [cookie_backend])
current_authenticated_user = fastapi_users.current_user()
current_optional_user_token = fastapi_users.authenticator.current_user_token(optional=True)

github_oauth_client = (
    VerifiedGitHubOAuth2(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, scopes=["read:user", "user:email"])
    if env.GITHUB_CLIENT_ID is not None and env.GITHUB_CLIENT_SECRET is not None
    else None
)


async def authuser(authenticated: User = Depends(current_authenticated_user)) -> User:
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
