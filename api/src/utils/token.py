import jwt
import hmac
from uuid import UUID
from datetime import UTC, datetime, timedelta
from pydantic import TypeAdapter, ValidationError
from longlink.types import Email
from src.utils.oauth import OAuthProvider
from src.environments import env
from src.database.services import users
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

JWT_ALGORITHM = "HS256"
AUTH_TOKEN_AUDIENCE = "longlink:auth"
REGISTRATION_TOKEN_AUDIENCE = "longlink:register"
PASSWORD_RESET_TOKEN_AUDIENCE = "longlink:reset-password"
OAUTH_STATE_TOKEN_AUDIENCE = "longlink:oauth"
EMAIL_TOKEN_LIFETIME_SECONDS = 3600
OAUTH_STATE_TOKEN_LIFETIME_SECONDS = 600

# Compile canonical email validation once for all signed registration claims.
EMAIL_ADAPTER = TypeAdapter(Email)


def password_fingerprint(password: str) -> str:
    """Return the signed-token fingerprint for one current password hash."""

    # Bind signed proof to the current credential without exposing its reusable hash.
    return hmac.digest(env.SESSION_KEY.encode("utf-8"), f"password-reset:{password}".encode(), "sha256").hex()


async def credential_user(session: AsyncSession, user_id: UUID, fingerprint: str) -> User | None:
    """Resolve an active user only while the credential matches their current password."""

    # Invalidate password-bound credentials when the account is deleted or its password changes.
    user = await users.active(session, user_id)
    if user is None or not hmac.compare_digest(fingerprint, password_fingerprint(user.password)):
        return None
    return user


def create_registration_token(email: Email) -> str:
    """Create one signed, expiring proof of email ownership."""

    # Sign the request identity into immutable registration proof.
    return jwt.encode(
        {"email": email, "aud": REGISTRATION_TOKEN_AUDIENCE, "exp": datetime.now(UTC) + timedelta(seconds=EMAIL_TOKEN_LIFETIME_SECONDS)},
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def registration_claims(token: str) -> Email:
    """Return the identity carried by one registration token."""

    # Reject invalid, expired, or wrong-purpose tokens before account setup.
    data = jwt.decode(token, env.SESSION_KEY, audience=REGISTRATION_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])

    email = data.get("email")
    if not isinstance(email, str) or not email:
        raise jwt.InvalidTokenError("Invalid registration token claims")

    # Signed claims still need domain-level email validation.
    try:
        return EMAIL_ADAPTER.validate_python(email)
    except ValidationError as exc:
        raise jwt.InvalidTokenError("Invalid registration token claims") from exc


def create_password_reset_token(user: User) -> str:
    """Create one signed password-reset proof bound to the current credential."""

    # Expire recovery proof quickly and invalidate it automatically after a password change.
    return jwt.encode(
        {
            "sub": str(user.id),
            "password_fingerprint": password_fingerprint(user.password),
            "aud": PASSWORD_RESET_TOKEN_AUDIENCE,
            "exp": datetime.now(UTC) + timedelta(seconds=EMAIL_TOKEN_LIFETIME_SECONDS),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def create_oauth_state_token(provider: OAuthProvider, state: str, verifier: str, return_to: str = "/user/organizations") -> str:
    """Create browser-only OAuth state bound to one provider and PKCE verifier."""

    # Keep the anti-forgery state and reusable verifier out of browser-accessible storage and redirect URLs.
    return jwt.encode(
        {
            "provider": provider,
            "state": state,
            "verifier": verifier,
            "return_to": return_to,
            # OAuth proof cannot be reused as a browser session or email token.
            "aud": OAUTH_STATE_TOKEN_AUDIENCE,
            "exp": datetime.now(UTC) + timedelta(seconds=OAUTH_STATE_TOKEN_LIFETIME_SECONDS),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def oauth_state_claims(token: str, provider: OAuthProvider) -> tuple[str, str, str]:
    """Decode and validate OAuth callback proof and its optional continuation once."""

    # Bind callbacks to their initiating provider before exchanging an authorization code.
    data = jwt.decode(token, env.SESSION_KEY, audience=OAUTH_STATE_TOKEN_AUDIENCE, algorithms=[JWT_ALGORITHM])
    state = data.get("state")
    verifier = data.get("verifier")
    if data.get("provider") != provider or not isinstance(state, str) or not isinstance(verifier, str):
        raise jwt.InvalidTokenError("Invalid OAuth state token claims")

    # Older credentials without a navigation hint retain the standard login destination.
    return_to = data.get("return_to")
    return state, verifier, return_to if isinstance(return_to, str) else "/user/organizations"


def _password_bound_claims(token: str, *, audience: str, claims_error: str, user_error: str) -> tuple[UUID, str]:
    """Validate purpose-specific proof and parse its password-bound identity."""

    # Validate the signature, lifetime, and purpose before accepting identity claims.
    data = jwt.decode(token, env.SESSION_KEY, audience=audience, algorithms=[JWT_ALGORITHM])
    raw_user_id = data.get("sub")
    fingerprint = data.get("password_fingerprint")
    if not isinstance(raw_user_id, str) or not isinstance(fingerprint, str):
        raise jwt.InvalidTokenError(claims_error)

    # Reject malformed subjects before either credential can resolve an account.
    try:
        return UUID(raw_user_id), fingerprint
    except ValueError as exc:
        raise jwt.InvalidTokenError(user_error) from exc


async def password_reset_user(session: AsyncSession, token: str) -> User:
    """Return the active user authenticated by one password-reset token."""

    # Decode and validate the reset credential before loading its account.
    user_id, fingerprint = _password_bound_claims(
        token,
        audience=PASSWORD_RESET_TOKEN_AUDIENCE,
        claims_error="Invalid password reset token claims",
        user_error="Invalid password reset user",
    )

    # Require an active account and the exact credential version that received the link.
    user = await credential_user(session, user_id, fingerprint)
    if user is None:
        raise jwt.InvalidTokenError("Invalid password reset token")
    return user


def create_auth_token(user: User) -> str:
    """Create one signed browser session bound to the current password credential."""

    # Bind browser authentication to the current password so password changes invalidate existing cookies.
    issued_at = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user.id),
            "password_fingerprint": password_fingerprint(user.password),
            "aud": AUTH_TOKEN_AUDIENCE,
            # Browser sessions remain bounded even when the password does not change.
            "iat": issued_at,
            "exp": issued_at + timedelta(days=30),
        },
        env.SESSION_KEY,
        algorithm=JWT_ALGORITHM,
    )


def auth_token_claims(token: str) -> tuple[UUID, str]:
    """Return the user and password fingerprint carried by one valid browser session."""

    # Validate the signature, lifetime, and token purpose before accepting its identity claims.
    return _password_bound_claims(
        token, audience=AUTH_TOKEN_AUDIENCE, claims_error="Invalid browser session claims", user_error="Invalid browser session user"
    )
