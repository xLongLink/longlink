import jwt
import pytest
from src import auth

pytestmark = pytest.mark.no_db


async def test_current_optional_user_rejects_malformed_credential_before_user_lookup(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid querying users for an invalid browser credential."""

    # Arrange
    queried = False

    def invalid_claims(_credential: str) -> tuple[object, str]:
        """Reject the supplied credential as malformed."""

        raise jwt.PyJWTError("invalid token")

    async def unexpected_active(*_args: object) -> None:
        """Fail when malformed credentials reach the database boundary."""

        nonlocal queried
        queried = True

    monkeypatch.setattr(auth.token, "auth_token_claims", invalid_claims)
    monkeypatch.setattr(auth.user_service, "active", unexpected_active)

    # Act
    user = await auth.current_optional_user("malformed-token", object())  # type: ignore[arg-type]

    # Assert
    assert user is None
    assert not queried
