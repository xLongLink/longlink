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


INVALID_SIGNED_TOKENS = [
    pytest.param(
        IDENTITY_SECRET,
        {"exp": datetime.now(UTC) - timedelta(seconds=1)},
        jwt.ExpiredSignatureError,
        id="expired",
    ),
    pytest.param(
        IDENTITY_SECRET,
        {"aud": "other-audience"},
        jwt.InvalidAudienceError,
        id="wrong-audience",
    ),
    pytest.param(
        "other-identity-secret-01234567890",
        {},
        jwt.InvalidSignatureError,
        id="wrong-secret",
    ),
]


@pytest.mark.parametrize(("secret", "claims", "expected_error"), INVALID_SIGNED_TOKENS)
def test_identity_token_user_rejects_invalid_signed_token(
    secret: str, claims: dict[str, object], expected_error: type[jwt.InvalidTokenError]
) -> None:
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
    with pytest.raises(expected_error):
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


def test_identity_token_user_rejects_malformed_subject() -> None:
    """Reject an otherwise valid identity token with a malformed UUID subject."""

    # Arrange
    issued_at = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": "not-a-uuid",
            "aud": identity.IDENTITY_TOKEN_AUDIENCE,
            "iat": issued_at,
            "exp": issued_at + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
        },
        IDENTITY_SECRET,
        algorithm=identity.IDENTITY_TOKEN_ALGORITHM,
    )

    # Act
    with pytest.raises(jwt.InvalidTokenError) as exc_info:
        identity.identity_token_user(token, IDENTITY_SECRET)

    # Assert
    assert type(exc_info.value) is jwt.InvalidTokenError
    assert str(exc_info.value) == "Invalid identity token user"


@pytest.mark.parametrize("missing_claim", ["sub", "aud", "iat", "exp"])
def test_identity_token_user_rejects_missing_required_claim(missing_claim: str) -> None:
    """Reject an otherwise valid identity token missing any required claim."""

    # Arrange
    issued_at = datetime.now(UTC)
    claims = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "aud": identity.IDENTITY_TOKEN_AUDIENCE,
        "iat": issued_at,
        "exp": issued_at + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
    }
    del claims[missing_claim]
    token = jwt.encode(claims, IDENTITY_SECRET, algorithm=identity.IDENTITY_TOKEN_ALGORITHM)

    # Act
    with pytest.raises(jwt.InvalidTokenError) as exc_info:
        identity.identity_token_user(token, IDENTITY_SECRET)

    # Assert
    assert type(exc_info.value) is jwt.InvalidTokenError
    assert str(exc_info.value) == "Invalid identity token claims"
