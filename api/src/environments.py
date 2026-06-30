from typing import Any, cast
from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

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

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.sample"),
        env_file_encoding="utf-8",
    )


env: Env = cast(Any, Env)()
