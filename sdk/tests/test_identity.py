import jwt
import pytest
from uuid import UUID
from datetime import UTC, datetime, timedelta
from longlink import identity

IDENTITY_SECRET = "test-identity-secret-01234567890"


def mint_identity_token(
    secret: str = IDENTITY_SECRET,
    claims: dict[str, object] | None = None,
    algorithm: str = identity.IDENTITY_TOKEN_ALGORITHM,
    omit: str | None = None,
) -> str:
    """Mint one execution-time identity token with controlled defects."""

    # Construct claims at execution time so expiry stays relative to the test run.
    issued_at = datetime.now(UTC)
    payload: dict[str, object] = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "aud": identity.IDENTITY_TOKEN_AUDIENCE,
        "iat": issued_at,
        "exp": issued_at + timedelta(seconds=identity.IDENTITY_TOKEN_LIFETIME_SECONDS),
    }

    if claims is not None:
        payload.update(claims)

    if omit is not None:
        del payload[omit]

    return jwt.encode(payload, secret, algorithm=algorithm)


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
    encoded = mint_identity_token(secret, claims)

    # Act and assert
    with pytest.raises(expected_error):
        identity.identity_token_user(encoded, IDENTITY_SECRET)


def test_identity_token_user_rejects_unapproved_algorithm() -> None:
    """Reject an otherwise valid identity assertion signed with another algorithm."""

    # Arrange
    identity_secret = IDENTITY_SECRET * 2
    encoded = mint_identity_token(identity_secret, algorithm="HS384")

    # Act and assert
    with pytest.raises(jwt.InvalidTokenError):
        identity.identity_token_user(encoded, identity_secret)


def test_identity_token_user_rejects_malformed_subject() -> None:
    """Reject an otherwise valid identity token with a malformed UUID subject."""

    # Arrange
    token = mint_identity_token(claims={"sub": "not-a-uuid"})

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
    token = mint_identity_token(omit=missing_claim)

    # Act
    with pytest.raises(jwt.InvalidTokenError) as exc_info:
        identity.identity_token_user(token, IDENTITY_SECRET)

    # Assert
    assert type(exc_info.value) is jwt.InvalidTokenError
    assert str(exc_info.value) == "Invalid identity token claims"
