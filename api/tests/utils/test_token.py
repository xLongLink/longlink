import jwt
import pytest
from uuid import UUID
from datetime import UTC, datetime, timedelta
from src.utils import token
from collections.abc import Mapping, Callable
from src.database.session import session_scope
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User


def signed_token(claims: Mapping[str, object]) -> str:
    """Sign controlled test claims with the configured session key and algorithm."""

    return jwt.encode(dict(claims), token.env.SESSION_KEY, algorithm=token.JWT_ALGORITHM)


def expired_token(claims: dict[str, str]) -> str:
    """Encode expired test credentials without repeating the expiry construction."""

    # Expire the credential one second before the validating clock reads it.
    return signed_token({**claims, "exp": datetime.now(UTC) - timedelta(seconds=1)})


@pytest.mark.no_db
def test_registration_claims_reject_auth_token_audience() -> None:
    """Keep registration proof separate from browser session credentials."""

    # Arrange
    user = User(email="member@example.com", password="hashed-password")
    authentication = token.create_auth_token(user)

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        token.registration_claims(authentication)


@pytest.mark.no_db
def test_auth_token_claims_reject_password_reset_token_audience() -> None:
    """Keep browser session credentials separate from reset credentials."""

    # Arrange
    user = User(email="member@example.com", password="hashed-password")
    password_reset = token.create_password_reset_token(user)

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        token.auth_token_claims(password_reset)


@pytest.mark.no_db
async def test_password_reset_user_rejects_registration_token_audience() -> None:
    """Keep recovery credentials separate from registration proof."""

    # Arrange
    registration = token.create_registration_token("member@example.com")

    # Act and assert
    async with AsyncSession() as session:
        with pytest.raises(jwt.InvalidTokenError):
            await token.password_reset_user(session, registration)


@pytest.mark.no_db
def test_auth_token_claims_reject_malformed_user_identity() -> None:
    """Reject browser credentials whose subject is not a UUID."""

    # Arrange
    invalid_token = signed_token(
        {
            "sub": "not-a-uuid",
            "password_fingerprint": "fingerprint",
            "aud": token.AUTH_TOKEN_AUDIENCE,
        }
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match="Invalid browser session user"):
        token.auth_token_claims(invalid_token)


EXPIRED_TOKEN_CLAIMS = [
    pytest.param(
        {"email": "member@example.com", "aud": token.REGISTRATION_TOKEN_AUDIENCE},
        token.registration_claims,
        id="registration",
    ),
    pytest.param(
        {
            "sub": "00000000-0000-0000-0000-000000000001",
            "password_fingerprint": "fingerprint",
            "aud": token.AUTH_TOKEN_AUDIENCE,
        },
        token.auth_token_claims,
        id="authentication",
    ),
]


@pytest.mark.no_db
@pytest.mark.parametrize(("claims", "function"), EXPIRED_TOKEN_CLAIMS)
def test_token_claims_reject_expired_token(claims: dict[str, str], function: Callable[[str], str | tuple[UUID, str]]) -> None:
    """Reject expired registration and browser credentials."""

    # Arrange
    encoded = expired_token(claims)

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        function(encoded)


@pytest.mark.no_db
def test_oauth_state_claims_rejects_cross_provider_token() -> None:
    """Reject OAuth browser credentials reused on another provider."""

    # Arrange
    credential = token.create_oauth_state_token("google", "expected-state", "pkce-verifier")

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match="Invalid OAuth state token claims"):
        token.oauth_state_claims(credential, "github")


@pytest.mark.no_db
def test_oauth_state_claims_reject_expired_token() -> None:
    """Reject expired OAuth browser credentials before exchanging an authorization code."""

    # Arrange
    encoded = expired_token(
        {
            "provider": "google",
            "state": "expected-state",
            "verifier": "pkce-verifier",
            "aud": token.OAUTH_STATE_TOKEN_AUDIENCE,
        }
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        token.oauth_state_claims(encoded, "google")


@pytest.mark.no_db
@pytest.mark.parametrize(
    ("claims", "function", "message"),
    [
        pytest.param(
            {"aud": token.REGISTRATION_TOKEN_AUDIENCE},
            token.registration_claims,
            "Invalid registration token claims",
            id="missing-registration-email",
        ),
        pytest.param(
            {"sub": "user", "aud": token.AUTH_TOKEN_AUDIENCE},
            token.auth_token_claims,
            "Invalid browser session claims",
            id="missing-auth-fingerprint",
        ),
    ],
)
def test_token_claims_reject_missing_required_fields(claims: dict[str, str], function, message: str) -> None:
    """Reject signed credentials that omit their required identity claims."""

    # Arrange
    encoded = signed_token(claims)

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match=message):
        function(encoded)


INVALID_PASSWORD_RESET_CLAIMS = [
    pytest.param(
        {
            "sub": "not-a-uuid",
            "password_fingerprint": "fingerprint",
            "aud": token.PASSWORD_RESET_TOKEN_AUDIENCE,
        },
        signed_token,
        "Invalid password reset user",
        id="malformed-subject",
    ),
    pytest.param(
        {"sub": "00000000-0000-0000-0000-000000000001", "aud": token.PASSWORD_RESET_TOKEN_AUDIENCE},
        signed_token,
        "Invalid password reset token claims",
        id="missing-fingerprint",
    ),
    pytest.param(
        {
            "sub": "00000000-0000-0000-0000-000000000001",
            "password_fingerprint": "fingerprint",
            "aud": token.PASSWORD_RESET_TOKEN_AUDIENCE,
        },
        expired_token,
        None,
        id="expired-token",
    ),
]


@pytest.mark.no_db
@pytest.mark.parametrize(("claims", "encode", "message"), INVALID_PASSWORD_RESET_CLAIMS)
async def test_password_reset_user_rejects_invalid_claims(
    claims: dict[str, str], encode: Callable[[dict[str, str]], str], message: str | None
) -> None:
    """Reject invalid recovery credentials before loading an account."""

    # Arrange
    encoded = encode(claims)

    # Act and assert
    async with AsyncSession() as session:
        with pytest.raises(jwt.InvalidTokenError, match=message):
            await token.password_reset_user(session, encoded)


async def test_password_reset_user_rejects_missing_account() -> None:
    """Reject password-reset credentials whose account is no longer active."""

    # Arrange
    user = User(email="missing@example.com", password="password-hash")
    encoded = token.create_password_reset_token(user)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(jwt.InvalidTokenError, match="Invalid password reset token"):
            await token.password_reset_user(session, encoded)


async def test_password_reset_user_rejects_changed_password(users: tuple[User, User, User]) -> None:
    """Invalidate a recovery link when its account password changes."""

    # Arrange
    user = users[0]
    reset_token = token.create_password_reset_token(user)

    async with session_scope() as session:
        persisted_user = await session.get(User, user.id)
        assert persisted_user is not None
        persisted_user.password = "changed-password"
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(jwt.InvalidTokenError, match="Invalid password reset token"):
            await token.password_reset_user(session, reset_token)


async def test_password_reset_user_returns_active_user(users: tuple[User, User, User]) -> None:
    """Resolve the active account bound to a valid recovery credential."""

    # Arrange
    user = users[0]
    reset_token = token.create_password_reset_token(user)

    # Act
    async with session_scope() as session:
        resolved_user = await token.password_reset_user(session, reset_token)

    # Assert
    assert resolved_user.id == user.id
