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

    model_config = SettingsConfigDict(
        env_file=(".env.sample", ".env") if _development_enabled() else (".env",),
        env_file_encoding="utf-8",
    )

env = Env(**{})
