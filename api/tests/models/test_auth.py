import pytest
import secrets
from pydantic import ValidationError
from src.models.auth import TokenPayload, PasswordLogin

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize("password", ["", "x" * 1025])
def test_login_rejects_password_outside_bounds(password: str) -> None:
    """Reject empty or oversized credentials before authentication work."""

    # Act / Assert
    with pytest.raises(ValidationError, match="password"):
        PasswordLogin(email="member@example.com", password=password)


def test_token_validation_preserves_opaque_proof() -> None:
    """Do not normalize signed proof at the request boundary."""

    # Preserve padding on an otherwise valid opaque credential.
    credential = f" {secrets.token_urlsafe(32)} "
    payload = TokenPayload(token=credential)

    # Assert
    assert payload.token == credential
