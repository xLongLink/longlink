import pytest
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

    # Act
    payload = TokenPayload(token=" opaque-proof ")  # noqa: S106

    # Assert
    assert payload.token == " opaque-proof "  # noqa: S105
