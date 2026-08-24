import pytest
from pydantic import ValidationError
from src.environments import Env

pytestmark = pytest.mark.no_db

ENVIRONMENT_SETTINGS = {
    "SESSION_KEY": "test-session-key-that-is-long-enough",
    "ADMIN_NAME": "Test Administrator",
    "ADMIN_EMAIL": "test-administrator@example.com",
    "ADMIN_PASSWORD": "longlink-test-password",
    "ENCRYPTION_KEY": "longlink-test-encryption-key-that-is-long-enough",
    "DATABASE_URL": "sqlite+aiosqlite:///./test.db",
    "SMTP_HOST": None,
    "SMTP_PASSWORD": None,
    "SMTP_USERNAME": None,
}


@pytest.mark.parametrize(
    ("settings", "message"),
    [
        pytest.param({"SMTP_USE_TLS": True}, "SMTP_USE_TLS and SMTP_START_TLS cannot both be enabled", id="tls-and-starttls"),
        pytest.param({"SMTP_USERNAME": "mailer"}, "SMTP_USERNAME and SMTP_PASSWORD must be configured together", id="username-only"),
        pytest.param({"SMTP_PASSWORD": "secret"}, "SMTP_USERNAME and SMTP_PASSWORD must be configured together", id="password-only"),
        pytest.param(
            {"SMTP_USERNAME": "mailer", "SMTP_PASSWORD": "secret"},
            "SMTP_HOST is required when SMTP authentication is configured",
            id="credentials-without-host",
        ),
    ],
)
def test_env_rejects_invalid_smtp_authentication_settings(settings: dict[str, object], message: str) -> None:
    """Reject ambiguous SMTP transport and incomplete authentication settings."""

    # Act and assert
    with pytest.raises(ValidationError, match=message):
        Env(**(ENVIRONMENT_SETTINGS | settings))


def test_env_accepts_complete_smtp_authentication_settings() -> None:
    """Accept one complete SMTP authentication configuration."""

    # Act
    settings = Env(**(ENVIRONMENT_SETTINGS | {"SMTP_HOST": "smtp.example.com", "SMTP_USERNAME": "mailer", "SMTP_PASSWORD": "secret"}))

    # Assert
    assert settings.SMTP_HOST == "smtp.example.com"
