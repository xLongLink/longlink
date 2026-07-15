import os
from pydantic import Field
from src.version import PLATFORM_VERSION_PATTERN
from pydantic_settings import BaseSettings, SettingsConfigDict

DEVELOPMENT = os.getenv("DEVELOPMENT", "").strip().lower() in {"1", "true", "yes", "on", "y"}


class Env(BaseSettings):
    """Define startup-validated settings for one LongLink Platform API replica.

    VERSION supplies the release affinity used when claiming reconciliation Operations.
    """

    # Runtime mode
    VERSION: str = Field(default="v0.0.0", pattern=PLATFORM_VERSION_PATTERN)
    DEVELOPMENT: bool = DEVELOPMENT

    # Session cookies
    SESSION_KEY: str

    # Control plane database URL
    DATABASE_URL: str

    # PostgreSQL adapter defaults.
    DATABASE_SSLMODE: str = "require"

    # Reconciliation
    RECONCILE_INTERVAL_SECONDS: int = Field(default=300, ge=30, le=86400)

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
