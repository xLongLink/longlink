import os
import urllib.parse
from pydantic_settings import BaseSettings, SettingsConfigDict

DEVELOPMENT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
)
INSECURE_SESSION_KEYS = {
    "1234",
    "changeme",
    "change-me",
    "longlink-secret",
    "replace-with-a-long-random-secret",
    "secret",
}
MINIMUM_SESSION_KEY_LENGTH = 32


def _development_enabled() -> bool:
    """Return whether local development configuration should be enabled."""

    development = os.getenv("DEVELOPMENT")
    if development is not None:
        return development.strip().lower() in {"1", "true", "yes", "on", "y"}

    return os.getenv("ENVIRONMENT", "").strip().lower() == "development"


def _environment_files() -> tuple[str, ...]:
    """Load sample values in development, so local `.env` values remain overridable."""

    if _development_enabled():
        return (".env.sample", ".env")

    return (".env",)


def resolve_cors_origins(development: bool, configured_origins: tuple[str, ...]) -> tuple[str, ...]:
    """Return explicit CORS origins, adding localhost defaults only in development."""

    if configured_origins:
        return configured_origins

    if development:
        return DEVELOPMENT_CORS_ORIGINS

    return ()


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    DEVELOPMENT: bool = _development_enabled()

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
    CORS_ORIGINS: tuple[str, ...] = ()

    # Development image registry
    LOCAL_CONTAINER_REGISTRY: str | None = None
    LOCAL_APPLICATION_IMAGE: str = "localhost:15000/longlink-app:dev"

    # Operation leases
    OPERATION_LEASE_SECONDS: int = 120
    OPERATION_HEARTBEAT_SECONDS: int = 30

    model_config = SettingsConfigDict(
        env_file=_environment_files(),
        env_file_encoding="utf-8",
    )


def validate_production_settings(settings: Env) -> None:
    """Fail fast when production settings are unsafe."""

    if settings.DEVELOPMENT:
        return

    errors: list[str] = []
    session_key = settings.SESSION_KEY.strip()
    if len(session_key) < MINIMUM_SESSION_KEY_LENGTH or session_key in INSECURE_SESSION_KEYS:
        errors.append("SESSION_KEY must be at least 32 random characters and cannot use a placeholder value")

    # OIDC traffic carries authentication secrets, so production auth endpoints must be HTTPS.
    for field_name in ("OIDC_ISSUER", "OIDC_REDIRECT_URI"):
        value = str(getattr(settings, field_name)).strip()
        parsed_url = urllib.parse.urlsplit(value)
        if parsed_url.scheme != "https" or not parsed_url.netloc:
            errors.append(f"{field_name} must be an HTTPS URL outside development")

    if errors:
        raise RuntimeError(f"Invalid production configuration: {'; '.join(errors)}")


env = Env(**{})
