import os
from uuid import UUID
from typing import Self
from pydantic import Field, model_validator
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

    # Authentication
    SESSION_KEY: str = Field(min_length=32)
    PUBLIC_URL: str = Field(default="http://localhost:5173", pattern=r"^https?://")
    AUTH_SESSION_LIFETIME_SECONDS: int = Field(default=2592000, ge=300, le=31536000)
    INITIAL_ADMIN_EMAIL: str | None = None

    # Authentication email delivery
    SMTP_HOST: str | None = None
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_START_TLS: bool = True
    SMTP_USE_TLS: bool = False
    SMTP_FROM: str | None = None

    # Optional authentication providers
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None

    # Control plane database URL
    DATABASE_URL: str

    # Reconciliation
    RECONCILE_INTERVAL_SECONDS: int = Field(default=300, ge=30, le=86400)

    # Exoscale provisioning
    EXOSCALE_API_KEY: str | None = None
    EXOSCALE_API_SECRET: str | None = None
    EXOSCALE_ORGANIZATION_ID: UUID | None = None

    model_config = SettingsConfigDict(
        env_file=(".env.sample", ".env") if DEVELOPMENT else (".env",),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_authentication(self) -> Self:
        """Require complete provider and email-delivery configuration."""

        # Reject partial GitHub configuration instead of hiding a broken provider.
        github_values = (self.GITHUB_CLIENT_ID, self.GITHUB_CLIENT_SECRET)
        if any(github_values) and not all(github_values):
            raise ValueError("GitHub authentication requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET")

        # Implicit TLS and STARTTLS are mutually exclusive SMTP transports.
        if self.SMTP_USE_TLS and self.SMTP_START_TLS:
            raise ValueError("SMTP_USE_TLS and SMTP_START_TLS cannot both be enabled")

        return self

    def exoscale(self) -> tuple[str, str, UUID]:
        """Return complete Platform-only Exoscale provisioning credentials."""

        # Require the complete provider identity only when an Exoscale adapter is selected.
        if self.EXOSCALE_API_KEY is None or self.EXOSCALE_API_SECRET is None or self.EXOSCALE_ORGANIZATION_ID is None:
            raise ValueError("Exoscale provisioning requires EXOSCALE_API_KEY, EXOSCALE_API_SECRET, and EXOSCALE_ORGANIZATION_ID")

        return self.EXOSCALE_API_KEY, self.EXOSCALE_API_SECRET, self.EXOSCALE_ORGANIZATION_ID


env = Env(**{})
