import jwt
import hmac
import hashlib
import secrets
from uuid import UUID
from datetime import timedelta
from sqlmodel import col
from sqlalchemy import delete, select
from src.environments import env
from longlink.utils.time import utcnow
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User, AccessToken

JWT_ALGORITHM = "HS256"
REGISTRATION_TOKEN_AUDIENCE = "longlink:register"
PASSWORD_RESET_TOKEN_AUDIENCE = "longlink:reset-password"
REGISTRATION_TOKEN_LIFETIME_SECONDS = 3600
PASSWORD_RESET_TOKEN_LIFETIME_SECONDS = 3600


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

    # Sign the already-normalized request identity into immutable registration proof.
    return jwt.encode(
        {
            "email": email,
            "next": next_path,
            "aud": REGISTRATION_TOKEN_AUDIENCE,
            "exp": utcnow() + timedelta(seconds=REGISTRATION_TOKEN_LIFETIME_SECONDS),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def registration_claims(token: str) -> tuple[str, str]:
    """Return the identity and navigation carried by one registration token."""

    # Reject invalid, expired, or wrong-purpose tokens before account setup.
    data = jwt.decode(token, env.SESSION_KEY, audience=REGISTRATION_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])

    email = data.get("email")
    next_path = data.get("next")
    if not isinstance(email, str) or not email or not isinstance(next_path, str):
        raise jwt.InvalidTokenError("Invalid registration token claims")
    return email, next_path


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
    data = jwt.decode(token, env.SESSION_KEY, audience=PASSWORD_RESET_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])
    raw_user_id = data.get("sub")
    fingerprint = data.get("password_fingerprint")
    if not isinstance(raw_user_id, str) or not isinstance(fingerprint, str):
        raise jwt.InvalidTokenError("Invalid password reset token claims")
    try:
        user_id = UUID(raw_user_id)
    except ValueError as exc:
        raise jwt.InvalidTokenError("Invalid password reset user") from exc

    # Require an active account and the exact credential version that received the link.
    statement = select(User).where(col(User.id) == user_id, col(User.deleted_at).is_(None))
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None or not hmac.compare_digest(fingerprint, password_fingerprint(user.hashed_password)):
        raise jwt.InvalidTokenError("Invalid password reset token")
    return user


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
