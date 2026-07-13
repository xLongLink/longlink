import os
from pydantic_settings import BaseSettings, SettingsConfigDict


DEVELOPMENT = os.getenv("DEVELOPMENT", "").strip().lower() in {"1", "true", "yes", "on", "y"}


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    # Runtime mode
    DEVELOPMENT: bool = DEVELOPMENT

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

    model_config = SettingsConfigDict(
        env_file=(".env.sample", ".env") if DEVELOPMENT else (".env",),
        env_file_encoding="utf-8",
    )


env = Env(**{})
