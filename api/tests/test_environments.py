import pytest
from pydantic import ValidationError
from src.environments import Env

pytestmark = pytest.mark.no_db

ENVIRONMENT_SETTINGS = {
    "DEVELOPMENT": False,
    "PUBLIC_URL": "https://platform.example",
    "SESSION_KEY": "test-session-key-that-is-long-enough",
    "GITHUB_OAUTH_CLIENT_ID": None,
    "GOOGLE_OAUTH_CLIENT_ID": None,
    "GITHUB_OAUTH_CLIENT_SECRET": None,
    "GOOGLE_OAUTH_CLIENT_SECRET": None,
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
        Env.model_validate(ENVIRONMENT_SETTINGS | settings)


@pytest.mark.parametrize(
    ("settings", "message"),
    [
        pytest.param({"PUBLIC_URL": "http://platform.example"}, "PUBLIC_URL must use HTTPS outside development", id="insecure-origin"),
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
    ],
)
def test_env_rejects_invalid_authentication_settings(settings: dict[str, object], message: str) -> None:
    """Reject insecure production origins and incomplete OAuth clients."""

    # Act and assert
    with pytest.raises(ValidationError, match=message):
        Env.model_validate(ENVIRONMENT_SETTINGS | settings)


def test_env_accepts_complete_smtp_authentication_settings() -> None:
    """Accept one complete SMTP authentication configuration."""

    # Assert
    settings = ENVIRONMENT_SETTINGS | {"SMTP_HOST": "smtp.example.com", "SMTP_USERNAME": "mailer", "SMTP_PASSWORD": "secret"}
    assert Env.model_validate(settings).SMTP_HOST == "smtp.example.com"
