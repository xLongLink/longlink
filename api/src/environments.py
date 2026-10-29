from typing import Self, Literal
from pydantic import Field, HttpUrl, model_validator
from longlink.types import Email
from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    """Define startup-validated settings for one LongLink Platform API replica."""

    # Optional Organization payments
    STRIPE_SECRET_KEY: str | None = Field(default=None, min_length=1)
    STRIPE_WEBHOOK_SECRET: str | None = Field(default=None, min_length=1)

    # Authentication
    PUBLIC_URL: str = Field(default="http://localhost:5173", pattern=r"^https?://")
    SESSION_KEY: str = Field(min_length=32)
    GITHUB_OAUTH_CLIENT_ID: str | None = Field(default=None, min_length=1)
    GOOGLE_OAUTH_CLIENT_ID: str | None = Field(default=None, min_length=1)
    GITHUB_OAUTH_CLIENT_SECRET: str | None = Field(default=None, min_length=1)
    GOOGLE_OAUTH_CLIENT_SECRET: str | None = Field(default=None, min_length=1)

    # Initial Platform administrator
    ADMIN_EMAIL: Email
    ADMIN_PASSWORD: str = Field(min_length=1)

    # Authentication email delivery
    SMTP_FROM: Email = "no-reply@longlink.dev"
    SMTP_HOST: str
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_TRANSPORT: Literal["plain", "starttls", "tls"] = "starttls"
    SMTP_PASSWORD: str | None = None
    SMTP_USERNAME: str | None = None

    # Encryption for infrastructure credentials persisted by the Platform
    ENCRYPTION_KEY: str = Field(min_length=32)

    # Control plane database URL
    DATABASE_URL: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", env_parse_none_str="null", extra="ignore")

    @property
    def stripe_enabled(self) -> bool:
        """Enable Stripe only when both credentials are configured."""

        return bool(self.STRIPE_SECRET_KEY and self.STRIPE_WEBHOOK_SECRET)

    @model_validator(mode="after")
    def validate_authentication(self) -> Self:
        """Validate authentication email-delivery configuration."""

        # Only loopback browser origins may use plaintext HTTP, independently of deployment mode.
        public = HttpUrl(self.PUBLIC_URL)
        if public.scheme != "https" and public.host not in {"localhost", "127.0.0.1", "[::1]"}:
            raise ValueError("PUBLIC_URL must use HTTPS except on loopback")
        if public.username is not None or public.password is not None or public.path not in {None, "/"} or public.query or public.fragment:
            raise ValueError("PUBLIC_URL must be an origin without credentials, path, query, or fragment")
        self.PUBLIC_URL = str(public).rstrip("/")

        # Paid deployments require a complete Stripe configuration; unconfigured installations remain free.
        if self.STRIPE_SECRET_KEY or self.STRIPE_WEBHOOK_SECRET:
            if self.STRIPE_SECRET_KEY is None or self.STRIPE_WEBHOOK_SECRET is None:
                raise ValueError("Stripe requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET")
            if not self.STRIPE_SECRET_KEY.startswith(("sk_test_", "sk_live_", "rk_test_", "rk_live_")):
                raise ValueError("STRIPE_SECRET_KEY must be a Stripe secret or restricted key")

            # Webhooks use a separate signing secret, not the API key.
            if not self.STRIPE_WEBHOOK_SECRET.startswith("whsec_"):
                raise ValueError("STRIPE_WEBHOOK_SECRET must be a Stripe signing secret")

        # All authentication workflows use a real SMTP server, including local mail capture.
        if not self.SMTP_HOST.strip():
            raise ValueError("SMTP_HOST is required")

        # Authenticated SMTP requires a complete credential pair and a delivery host.
        if (self.SMTP_USERNAME is None) != (self.SMTP_PASSWORD is None):
            raise ValueError("SMTP_USERNAME and SMTP_PASSWORD must be configured together")

        # OAuth providers require both confidential client credentials before their routes are enabled.
        if (self.GOOGLE_OAUTH_CLIENT_ID is None) != (self.GOOGLE_OAUTH_CLIENT_SECRET is None):
            raise ValueError("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together")
        if (self.GITHUB_OAUTH_CLIENT_ID is None) != (self.GITHUB_OAUTH_CLIENT_SECRET is None):
            raise ValueError("GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET must be configured together")

        return self


env = Env()
