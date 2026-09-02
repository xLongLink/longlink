import jwt
import pytest
from uuid import UUID
from datetime import UTC, datetime, timedelta
from longlink import identity

IDENTITY_SECRET = "test-identity-secret-01234567890"


def test_identity_token_user_returns_identity_from_created_token() -> None:
    """Resolve the user bound to a current Platform identity assertion."""

    # Arrange
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    token = identity.create_identity_token(user_id, IDENTITY_SECRET)

    # Act
    result = identity.identity_token_user(token, IDENTITY_SECRET)

    # Assert
    assert result == user_id


def test_identity_token_user_rejects_empty_identity_secret() -> None:
    """Reject identity verification when the Solution secret is absent."""

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match="Identity secret is required"):
        identity.identity_token_user("token", "")


@pytest.mark.parametrize(
    ("secret", "claims"),
    [
        pytest.param(
            IDENTITY_SECRET,
            {"exp": datetime.now(UTC) - timedelta(seconds=1)},
            id="expired",
        ),
        pytest.param(
            IDENTITY_SECRET,
            {"aud": "other-audience"},
            id="wrong-audience",
        ),
        pytest.param(
            "other-identity-secret-01234567890",
            {},
            id="wrong-secret",
        ),
    ],
)
def test_identity_token_user_rejects_invalid_signed_token(secret: str, claims: dict[str, object]) -> None:
    """Reject expired, wrongly scoped, and incorrectly signed identity assertions."""

    # Arrange
    encoded = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000001",
            "aud": identity.IDENTITY_TOKEN_AUDIENCE,
            "iat": datetime.now(UTC),
            "exp": datetime.now(UTC) + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
            **claims,
        },
        secret,
        algorithm=identity.IDENTITY_TOKEN_ALGORITHM,
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        identity.identity_token_user(encoded, IDENTITY_SECRET)


def test_identity_token_user_rejects_unapproved_algorithm() -> None:
    """Reject an otherwise valid identity assertion signed with another algorithm."""

    # Arrange
    identity_secret = IDENTITY_SECRET * 2
    issued_at = datetime.now(UTC)
    encoded = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000001",
            "aud": identity.IDENTITY_TOKEN_AUDIENCE,
            "iat": issued_at,
            "exp": issued_at + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
        },
        identity_secret,
        algorithm="HS384",
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        identity.identity_token_user(encoded, identity_secret)


@pytest.mark.parametrize(
    ("claims", "message"),
    [
        pytest.param({}, "Invalid identity token claims", id="missing-subject"),
        pytest.param({"sub": "not-a-uuid"}, "Invalid identity token user", id="malformed-subject"),
    ],
)
def test_identity_token_user_rejects_invalid_subject_claims(claims: dict[str, str], message: str) -> None:
    """Reject validly signed identity tokens without a valid UUID subject."""

    # Arrange
    token = jwt.encode(
        {
            "aud": identity.IDENTITY_TOKEN_AUDIENCE,
            "iat": datetime.now(UTC),
            "exp": datetime.now(UTC) + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
            **claims,
        },
        IDENTITY_SECRET,
        algorithm=identity.IDENTITY_TOKEN_ALGORITHM,
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match=message):
        identity.identity_token_user(token, IDENTITY_SECRET)
