import os
from pydantic_settings import BaseSettings, SettingsConfigDict


def _development_enabled() -> bool:
    """Return whether local development configuration should be enabled."""

    development = os.getenv("DEVELOPMENT")

    # Prefer the explicit development flag when it is set.
    if development is not None:
        return development.strip().lower() in {"1", "true", "yes", "on", "y"}

    return os.getenv("ENVIRONMENT", "").strip().lower() == "development"


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    # Runtime mode
    DEVELOPMENT: bool = _development_enabled()

    # Session cookies
    SESSION_KEY: str

    # Control plane database URL
    DATABASE_URL: str

    # PostgreSQL adapter defaults.
    DATABASE_SSLMODE: str = "require"

    # OIDC bridge credentials
    OIDC_ISSUER: str
    OIDC_CLIENT_ID: str
    OIDC_REDIRECT_URI: str
    OIDC_CLIENT_SECRET: str

    # Email sender configuration
    EMAIL_ENABLED: bool = False
    EMAIL_FROM_NAME: str | None = None
    EMAIL_SMTP_HOST: str | None = None
    EMAIL_SMTP_PORT: int | None = None
    EMAIL_FROM_ADDRESS: str | None = None
    EMAIL_MJML_COMMAND: str | None = None
    EMAIL_SMTP_USE_SSL: bool | None = None
    EMAIL_SMTP_USE_TLS: bool | None = None
    EMAIL_SMTP_PASSWORD: str | None = None
    EMAIL_SMTP_USERNAME: str | None = None
    EMAIL_SMTP_TIMEOUT_SECONDS: int | None = None

    model_config = SettingsConfigDict(
        env_file=(".env.sample", ".env") if _development_enabled() else (".env",),
        env_file_encoding="utf-8",
    )

env = Env(**{})
