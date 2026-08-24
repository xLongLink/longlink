import jwt
import pytest
from uuid import UUID
from datetime import timedelta
from longlink import identity
from longlink.utils.time import utcnow

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


@pytest.mark.parametrize(
    ("secret", "claims"),
    [
        pytest.param(
            IDENTITY_SECRET,
            {"exp": utcnow() - timedelta(seconds=1)},
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
            "iat": utcnow(),
            "exp": utcnow() + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
            **claims,
        },
        secret,
        algorithm=identity.IDENTITY_TOKEN_ALGORITHM,
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        identity.identity_token_user(encoded, IDENTITY_SECRET)


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
            "iat": utcnow(),
            "exp": utcnow() + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
            **claims,
        },
        IDENTITY_SECRET,
        algorithm=identity.IDENTITY_TOKEN_ALGORITHM,
    )

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError, match=message):
        identity.identity_token_user(token, IDENTITY_SECRET)
