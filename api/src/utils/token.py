import jwt
import hmac
import hashlib
from uuid import UUID
from datetime import timedelta
from src.environments import env
from longlink.utils.time import utcnow
from src.database.services import users
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

JWT_ALGORITHM = "HS256"
AUTH_TOKEN_AUDIENCE = "longlink:auth"
REGISTRATION_TOKEN_AUDIENCE = "longlink:register"
PASSWORD_RESET_TOKEN_AUDIENCE = "longlink:reset-password"
EMAIL_TOKEN_LIFETIME_SECONDS = 3600


def password_fingerprint(password: str) -> str:
    """Return the signed-token fingerprint for one current password hash."""

    # Bind signed proof to the current credential without exposing its reusable hash.
    return hmac.new(env.SESSION_KEY.encode("utf-8"), f"password-reset:{password}".encode(), hashlib.sha256).hexdigest()


def create_registration_token(email: str) -> str:
    """Create one signed, expiring proof of email ownership."""

    # Sign the request identity into immutable registration proof.
    return jwt.encode(
        {
            "email": email,
            "aud": REGISTRATION_TOKEN_AUDIENCE,
            "exp": utcnow() + timedelta(seconds=EMAIL_TOKEN_LIFETIME_SECONDS),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def registration_claims(token: str) -> str:
    """Return the identity carried by one registration token."""

    # Reject invalid, expired, or wrong-purpose tokens before account setup.
    data = jwt.decode(token, env.SESSION_KEY, audience=REGISTRATION_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])

    email = data.get("email")
    if not isinstance(email, str) or not email:
        raise jwt.InvalidTokenError("Invalid registration token claims")
    return email


def create_password_reset_token(user: User) -> str:
    """Create one signed password-reset proof bound to the current credential."""

    # Expire recovery proof quickly and invalidate it automatically after a password change.
    return jwt.encode(
        {
            "sub": str(user.id),
            "password_fingerprint": password_fingerprint(user.password),
            "aud": PASSWORD_RESET_TOKEN_AUDIENCE,
            "exp": utcnow() + timedelta(seconds=EMAIL_TOKEN_LIFETIME_SECONDS),
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
    user = await users.active(session, user_id)
    if user is None or not hmac.compare_digest(fingerprint, password_fingerprint(user.password)):
        raise jwt.InvalidTokenError("Invalid password reset token")
    return user


def create_auth_token(user: User) -> str:
    """Create one signed browser session bound to the current password credential."""

    # Bind browser authentication to the current password so password changes invalidate existing cookies.
    issued_at = utcnow()
    return jwt.encode(
        {
            "sub": str(user.id),
            "password_fingerprint": password_fingerprint(user.password),
            "aud": AUTH_TOKEN_AUDIENCE,
            "iat": issued_at,
            "exp": issued_at + timedelta(seconds=env.AUTH_SESSION_LIFETIME_SECONDS),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def auth_token_claims(token: str) -> tuple[UUID, str]:
    """Return the user and password fingerprint carried by one valid browser session."""

    # Validate the signature, lifetime, and token purpose before accepting its identity claims.
    data = jwt.decode(token, env.SESSION_KEY, audience=AUTH_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])
    raw_user_id = data.get("sub")
    fingerprint = data.get("password_fingerprint")
    if not isinstance(raw_user_id, str) or not isinstance(fingerprint, str):
        raise jwt.InvalidTokenError("Invalid browser session claims")
    try:
        return UUID(raw_user_id), fingerprint
    except ValueError as exc:
        raise jwt.InvalidTokenError("Invalid browser session user") from exc
