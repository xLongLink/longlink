import os
from typing import Self
from pydantic import Field, EmailStr, field_validator, model_validator
from src.models.types import PlatformVersion
from pydantic_settings import BaseSettings, SettingsConfigDict

DEVELOPMENT = os.getenv("DEVELOPMENT", "").strip().lower() in {"1", "true", "yes", "on", "y"}


class Env(BaseSettings):
    """Define startup-validated settings for one LongLink Platform API replica.

    VERSION supplies the release affinity used when claiming reconciliation Operations.
    """

    # Runtime mode
    VERSION: PlatformVersion = PlatformVersion("v0.0.0")
    DEVELOPMENT: bool = DEVELOPMENT
    OPERATION_TIMEOUT_SECONDS: int = Field(default=600, ge=60, le=1740)

    # Authentication
    PUBLIC_URL: str = Field(default="http://localhost:5173", pattern=r"^https?://")
    SESSION_KEY: str = Field(min_length=32)
    AUTH_SESSION_LIFETIME_SECONDS: int = Field(default=2592000, ge=300, le=31536000)

    # Initial Platform administrator
    ADMIN_NAME: str = Field(min_length=1)
    ADMIN_EMAIL: EmailStr
    ADMIN_PASSWORD: str = Field(min_length=1)

    # Authentication email delivery
    SMTP_HOST: str | None = None
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USE_TLS: bool = False
    SMTP_PASSWORD: str | None = None
    SMTP_USERNAME: str | None = None
    SMTP_START_TLS: bool = True

    # Encryption for infrastructure credentials persisted by the Platform
    ENCRYPTION_KEY: str = Field(min_length=32)

    # Control plane database URL
    DATABASE_URL: str

    model_config = SettingsConfigDict(
        env_file=(".env.sample", ".env") if DEVELOPMENT else (".env",),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("ADMIN_EMAIL", mode="before")
    @classmethod
    def normalize_administrator_email(cls, value: object) -> object:
        """Normalize administrator email identity before validation."""

        # Preserve Pydantic's type validation for values that are not strings.
        return value.strip().lower() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_authentication(self) -> Self:
        """Validate authentication email-delivery configuration."""

        # Implicit TLS and STARTTLS are mutually exclusive SMTP transports.
        if self.SMTP_USE_TLS and self.SMTP_START_TLS:
            raise ValueError("SMTP_USE_TLS and SMTP_START_TLS cannot both be enabled")

        # Authenticated SMTP requires a complete credential pair and a delivery host.
        if (self.SMTP_USERNAME is None) != (self.SMTP_PASSWORD is None):
            raise ValueError("SMTP_USERNAME and SMTP_PASSWORD must be configured together")
        if self.SMTP_USERNAME is not None and self.SMTP_HOST is None:
            raise ValueError("SMTP_HOST is required when SMTP authentication is configured")

        return self


env = Env()
