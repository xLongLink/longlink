import jwt
import pytest
from datetime import timedelta
from longlink import identity
from longlink.utils.time import utcnow

IDENTITY_SECRET = "test-identity-secret-01234567890"


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
