import pytest
from pydantic import ValidationError
from src.environments import Env

pytestmark = pytest.mark.no_db

ENVIRONMENT_SETTINGS = {
    "PUBLIC_URL": "https://platform.example",
    "SESSION_KEY": "test-session-key-that-is-long-enough",
    "GITHUB_OAUTH_CLIENT_ID": None,
    "GOOGLE_OAUTH_CLIENT_ID": None,
    "GITHUB_OAUTH_CLIENT_SECRET": None,
    "GOOGLE_OAUTH_CLIENT_SECRET": None,
    "ADMIN_EMAIL": "test-administrator@example.com",
    "ADMIN_PASSWORD": "longlink-test-password",
    "ENCRYPTION_KEY": "longlink-test-encryption-key-that-is-long-enough",
    "DATABASE_URL": "sqlite+aiosqlite:///./test.db",
    "SMTP_HOST": "smtp.example.com",
    "SMTP_PASSWORD": None,
    "SMTP_USERNAME": None,
}


INVALID_AUTHENTICATION_SETTINGS = [
    pytest.param({"SMTP_USERNAME": "mailer"}, "SMTP_USERNAME and SMTP_PASSWORD must be configured together", id="username-only"),
    pytest.param({"SMTP_HOST": None}, "Input should be a valid string", id="without-host"),
    pytest.param({"PUBLIC_URL": "http://platform.example"}, "PUBLIC_URL must use HTTPS except on loopback", id="insecure-origin"),
    pytest.param(
        {"GOOGLE_OAUTH_CLIENT_ID": "google-client"},
        "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together",
        id="google-client-only",
    ),
    pytest.param(
        {"GITHUB_OAUTH_CLIENT_SECRET": "github-secret"},
        "GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET must be configured together",
        id="github-secret-only",
    ),
]


@pytest.mark.parametrize(("settings", "message"), INVALID_AUTHENTICATION_SETTINGS)
def test_env_rejects_invalid_authentication_settings(settings: dict[str, object], message: str) -> None:
    """Reject insecure origins and incomplete SMTP or OAuth settings."""

    # Arrange
    configuration = ENVIRONMENT_SETTINGS | settings

    # Act and assert
    with pytest.raises(ValidationError, match=message):
        Env.model_validate(configuration)


def test_env_accepts_complete_smtp_authentication_settings() -> None:
    """Accept one complete SMTP authentication configuration."""

    # Validate both newly supplied credentials.
    settings = ENVIRONMENT_SETTINGS | {"SMTP_USERNAME": "mailer", "SMTP_PASSWORD": "secret"}
    environment = Env.model_validate(settings)

    assert environment.SMTP_USERNAME == "mailer"
    assert environment.SMTP_PASSWORD == "secret"


def test_env_accepts_loopback_with_smtp_delivery() -> None:
    """Use explicit loopback and SMTP settings for a host-run instance."""

    # Act
    environment = Env.model_validate(ENVIRONMENT_SETTINGS | {"PUBLIC_URL": "http://localhost:5173", "SMTP_HOST": "127.0.0.1"})

    # Assert
    assert environment.SMTP_HOST == "127.0.0.1"
    assert environment.PUBLIC_URL == "http://localhost:5173"
