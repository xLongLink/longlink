import os
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

    # Control plane database URL
    DATABASE_URL: str

    # Reconciliation
    RECONCILE_INTERVAL_SECONDS: int = Field(default=300, ge=30, le=86400)

    model_config = SettingsConfigDict(
        env_file=(".env.sample", ".env") if DEVELOPMENT else (".env",),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_authentication(self) -> Self:
        """Validate authentication email-delivery configuration."""

        # Implicit TLS and STARTTLS are mutually exclusive SMTP transports.
        if self.SMTP_USE_TLS and self.SMTP_START_TLS:
            raise ValueError("SMTP_USE_TLS and SMTP_START_TLS cannot both be enabled")

        return self


env = Env(**{})
