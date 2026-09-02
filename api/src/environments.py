import os
from typing import Self
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from longlink.shared.models import Email


class Env(BaseSettings):
    """Define startup-validated settings for one LongLink Platform API replica."""

    # Runtime mode
    DEVELOPMENT: bool = False
    OPERATION_TIMEOUT_SECONDS: int = Field(default=600, ge=60, le=1740)

    # Authentication
    PUBLIC_URL: str = Field(default="http://localhost:5173", pattern=r"^https?://")
    SESSION_KEY: str = Field(min_length=32)
    AUTH_SESSION_LIFETIME_SECONDS: int = Field(default=2592000, ge=300, le=31536000)
    GITHUB_OAUTH_CLIENT_ID: str | None = Field(default=None, min_length=1)
    GOOGLE_OAUTH_CLIENT_ID: str | None = Field(default=None, min_length=1)
    GITHUB_OAUTH_CLIENT_SECRET: str | None = Field(default=None, min_length=1)
    GOOGLE_OAUTH_CLIENT_SECRET: str | None = Field(default=None, min_length=1)

    # Initial Platform administrator
    ADMIN_NAME: str = Field(min_length=1)
    ADMIN_EMAIL: Email
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
        env_file=(".env.sample", ".env") if os.getenv("DEVELOPMENT", "").strip().lower() in {"1", "true", "yes", "on", "y"} else (".env",),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_authentication(self) -> Self:
        """Validate authentication email-delivery configuration."""

        # Public browser origins carrying authentication flows must be encrypted outside development.
        if not self.DEVELOPMENT and not self.PUBLIC_URL.startswith("https://"):
            raise ValueError("PUBLIC_URL must use HTTPS outside development")

        # Production authentication workflows require a usable email-delivery host.
        if not self.DEVELOPMENT and (self.SMTP_HOST is None or not self.SMTP_HOST.strip()):
            raise ValueError("SMTP_HOST is required outside development")

        # Implicit TLS and STARTTLS are mutually exclusive SMTP transports.
        if self.SMTP_USE_TLS and self.SMTP_START_TLS:
            raise ValueError("SMTP_USE_TLS and SMTP_START_TLS cannot both be enabled")

        # Authenticated SMTP requires a complete credential pair and a delivery host.
        if (self.SMTP_USERNAME is None) != (self.SMTP_PASSWORD is None):
            raise ValueError("SMTP_USERNAME and SMTP_PASSWORD must be configured together")
        if self.SMTP_USERNAME is not None and self.SMTP_HOST is None:
            raise ValueError("SMTP_HOST is required when SMTP authentication is configured")

        # OAuth providers require both confidential client credentials before their routes are enabled.
        if (self.GOOGLE_OAUTH_CLIENT_ID is None) != (self.GOOGLE_OAUTH_CLIENT_SECRET is None):
            raise ValueError("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together")
        if (self.GITHUB_OAUTH_CLIENT_ID is None) != (self.GITHUB_OAUTH_CLIENT_SECRET is None):
            raise ValueError("GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET must be configured together")

        return self

    def trusted_origins(self) -> set[str]:
        """Return the browser origins allowed to perform cookie-authenticated requests."""

        # The configured frontend origin is the only production trust anchor.
        public_origin = self.PUBLIC_URL.rstrip("/")
        trusted_origins = {public_origin}

        # Development frontends are reachable through both loopback hostnames.
        if self.DEVELOPMENT:
            trusted_origins.add(public_origin.replace("://localhost", "://127.0.0.1"))
            trusted_origins.add(public_origin.replace("://127.0.0.1", "://localhost"))

        return trusted_origins


env = Env()
