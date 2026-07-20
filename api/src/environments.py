import os
from uuid import UUID
from pydantic import Field
from src.version import PLATFORM_VERSION_PATTERN
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.models.infrastructure import DatabaseSSLMode

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
    DATABASE_SSLMODE: DatabaseSSLMode = "require"

    # Reconciliation
    RECONCILE_INTERVAL_SECONDS: int = Field(default=300, ge=30, le=86400)

    # Exoscale provisioning
    EXOSCALE_API_KEY: str | None = None
    EXOSCALE_API_SECRET: str | None = None
    EXOSCALE_ORGANIZATION_ID: UUID | None = None

    # OIDC bridge credentials
    OIDC_ISSUER: str
    OIDC_CLIENT_ID: str
    OIDC_REDIRECT_URI: str
    OIDC_CLIENT_SECRET: str

    model_config = SettingsConfigDict(
        env_file=(".env.sample", ".env") if DEVELOPMENT else (".env",),
        env_file_encoding="utf-8",
    )

    def exoscale(self) -> tuple[str, str, UUID]:
        """Return complete Platform-only Exoscale provisioning credentials."""

        # Require the complete provider identity only when an Exoscale adapter is selected.
        if self.EXOSCALE_API_KEY is None or self.EXOSCALE_API_SECRET is None or self.EXOSCALE_ORGANIZATION_ID is None:
            raise ValueError("Exoscale provisioning requires EXOSCALE_API_KEY, EXOSCALE_API_SECRET, and EXOSCALE_ORGANIZATION_ID")

        return self.EXOSCALE_API_KEY, self.EXOSCALE_API_SECRET, self.EXOSCALE_ORGANIZATION_ID


env = Env(**{})
