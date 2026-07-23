import pytest
from pydantic import ValidationError
from src.models.auth import RegistrationRequest, RegistrationComplete, RegistrationTokenConfirm

pytestmark = pytest.mark.no_db


def test_registration_models_accept_complete_account_flow() -> None:
    """Accept email proof followed by profile and password setup."""

    # Validate each browser payload at its API boundary.
    request = RegistrationRequest.model_validate({"email": "registered@example.com"})
    confirmation = RegistrationTokenConfirm.model_validate({"token": "signed-token"})
    completion = RegistrationComplete.model_validate(
        {
            "name": "Registered",
            "email": "registered@example.com",
            "surname": "User",
            "password": "longlink-test-password",
        }
    )

    assert request.email == "registered@example.com"
    assert confirmation.token == "signed-token"
    assert completion.name == "Registered"
    assert completion.surname == "User"
    assert completion.password == "longlink-test-password"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "email": "registered@example.com", "surname": "User", "password": "longlink-test-password"},
        {"name": "Registered", "email": "not-email", "surname": "User", "password": "longlink-test-password"},
        {"name": "Registered", "email": "registered@example.com", "surname": "", "password": "longlink-test-password"},
        {"name": "Registered", "email": "registered@example.com", "surname": "User", "password": "short"},
    ],
)
def test_registration_complete_rejects_invalid_account_values(payload: dict[str, str]) -> None:
    """Reject profile and password values outside local account policy."""

    # Invalid account data fails before persistence begins.
    with pytest.raises(ValidationError):
        RegistrationComplete.model_validate(payload)
