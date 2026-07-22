import pytest
from pydantic import ValidationError
from src.models.auth import AuthUserCreate

pytestmark = pytest.mark.no_db


def test_auth_user_create_accepts_registration_payload() -> None:
    """Accept the local registration payload used by generated auth routes."""

    # Validate the browser registration payload at the API model boundary.
    payload = AuthUserCreate.model_validate(
        {
            "name": "Registered User",
            "email": "registered@example.com",
            "password": "longlink-test-password",
        }
    )

    assert payload.name == "Registered User"
    assert payload.email == "registered@example.com"
    assert payload.password == "longlink-test-password"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "email": "registered@example.com", "password": "longlink-test-password"},
        {"name": "Registered User", "email": "not-email", "password": "longlink-test-password"},
        {"name": "Registered User", "email": "registered@example.com", "password": "short"},
    ],
)
def test_auth_user_create_rejects_invalid_registration_values(payload: dict[str, str]) -> None:
    """Reject registration values outside LongLink's local account policy."""

    # Invalid account data fails before reaching FastAPI Users persistence.
    with pytest.raises(ValidationError):
        AuthUserCreate.model_validate(payload)
