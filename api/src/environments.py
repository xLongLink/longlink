from os import getenv
from typing import Any, cast

from pydantic_settings import BaseSettings, SettingsConfigDict


def _environment_files() -> tuple[str, ...]:
    """Load sample values in development, so local `.env` values remain overridable."""

    if getenv("DEVELOPMENT", "").strip().lower() in {"1", "true", "yes", "on", "y"}:
        return (".env.sample", ".env")

    return (".env",)


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    DEVELOPMENT: bool = False

    # Session cookies
    SESSION_KEY: str

    # Control plane database URL
    DATABASE_URL: str

    # PostgreSQL adapter defaults.
    DATABASE_SSLMODE: str = "require"

    # OIDC bridge credentials
    OIDC_CLIENT_ID: str
    OIDC_CLIENT_SECRET: str
    OIDC_ISSUER: str
    OIDC_REDIRECT_URI: str

    # Email sender configuration
    EMAIL_ENABLED: bool = False
    EMAIL_FROM_ADDRESS: str | None = None
    EMAIL_FROM_NAME: str | None = None
    EMAIL_MJML_COMMAND: str | None = None
    EMAIL_SMTP_HOST: str | None = None
    EMAIL_SMTP_PORT: int | None = None
    EMAIL_SMTP_TIMEOUT_SECONDS: int | None = None
    EMAIL_SMTP_USERNAME: str | None = None
    EMAIL_SMTP_PASSWORD: str | None = None
    EMAIL_SMTP_USE_SSL: bool | None = None
    EMAIL_SMTP_USE_TLS: bool | None = None

    # Development CORS
    CORS_ORIGINS: tuple[str, ...] = (
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    )

    # Operation leases
    OPERATION_LEASE_SECONDS: int = 120
    OPERATION_HEARTBEAT_SECONDS: int = 30

    model_config = SettingsConfigDict(
        env_file=_environment_files(),
        env_file_encoding="utf-8",
    )


env: Env = cast(Any, Env)()
