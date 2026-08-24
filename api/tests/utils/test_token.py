import jwt
import pytest
from src.utils import token
from src.database.session import session_scope
from src.database.models.users import User


def test_registration_claims_reject_auth_token_audience() -> None:
    """Keep registration proof separate from browser session credentials."""

    # Arrange
    user = User(email="member@example.com", password="hashed-password")
    authentication = token.create_auth_token(user)

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        token.registration_claims(authentication)


def test_auth_token_claims_reject_password_reset_token_audience() -> None:
    """Keep browser session credentials separate from reset credentials."""

    # Arrange
    user = User(email="member@example.com", password="hashed-password")
    password_reset = token.create_password_reset_token(user)

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        token.auth_token_claims(password_reset)


async def test_password_reset_user_rejects_registration_token_audience() -> None:
    """Keep recovery credentials separate from registration proof."""

    # Arrange
    registration = token.create_registration_token("member@example.com")

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(jwt.InvalidTokenError):
            await token.password_reset_user(session, registration)


def test_auth_token_claims_reject_malformed_user_identity() -> None:
    """Reject browser credentials whose subject is not a UUID."""

    # Arrange
    invalid_token = jwt.encode(
        {
            "sub": "not-a-uuid",
            "password_fingerprint": "fingerprint",
            "aud": token.AUTH_TOKEN_AUDIENCE,
        },
        token.env.SESSION_KEY,
        algorithm=token.JWT_ALGORITHM,
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match="Invalid browser session user"):
        token.auth_token_claims(invalid_token)


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
    encoded = jwt.encode(claims, token.env.SESSION_KEY, algorithm=token.JWT_ALGORITHM)

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match=message):
        function(encoded)


async def test_password_reset_user_rejects_malformed_subject(users: tuple[User, User, User]) -> None:
    """Reject password-reset credentials whose subject is not a user UUID."""

    # Arrange
    encoded = jwt.encode(
        {
            "sub": "not-a-uuid",
            "password_fingerprint": token.password_fingerprint(users[0].password),
            "aud": token.PASSWORD_RESET_TOKEN_AUDIENCE,
        },
        token.env.SESSION_KEY,
        algorithm=token.JWT_ALGORITHM,
    )

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(jwt.InvalidTokenError, match="Invalid password reset user"):
            await token.password_reset_user(session, encoded)


async def test_password_reset_user_rejects_missing_fingerprint(users: tuple[User, User, User]) -> None:
    """Reject password-reset credentials that omit their password binding."""

    # Arrange
    encoded = jwt.encode(
        {"sub": str(users[0].id), "aud": token.PASSWORD_RESET_TOKEN_AUDIENCE},
        token.env.SESSION_KEY,
        algorithm=token.JWT_ALGORITHM,
    )

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(jwt.InvalidTokenError, match="Invalid password reset token claims"):
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


async def test_password_reset_user_rejects_missing_claims() -> None:
    """Reject recovery credentials that omit the user or password proof."""

    # Arrange
    encoded = jwt.encode(
        {"aud": token.PASSWORD_RESET_TOKEN_AUDIENCE},
        token.env.SESSION_KEY,
        algorithm=token.JWT_ALGORITHM,
    )

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(jwt.InvalidTokenError, match="Invalid password reset token claims"):
            await token.password_reset_user(session, encoded)


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
