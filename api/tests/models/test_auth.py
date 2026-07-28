import pytest
from pydantic import ValidationError
from src.models.auth import RegistrationComplete

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "email": "registered@example.com", "surname": "User", "password": "longlink-test-password"},
        {"name": "Registered", "email": "", "surname": "User", "password": "longlink-test-password"},
        {"name": "Registered", "email": "registered@example.com", "surname": "", "password": "longlink-test-password"},
        {"name": "Registered", "email": "registered@example.com", "surname": "User", "password": ""},
    ],
)
def test_registration_complete_rejects_invalid_account_values(payload: dict[str, str]) -> None:
    """Reject profile and password values outside local account policy."""

    # Invalid account data fails before persistence begins.
    with pytest.raises(ValidationError):
        RegistrationComplete.model_validate(payload)
