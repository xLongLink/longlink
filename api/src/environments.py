from typing import Self, Literal
from pydantic import Field, HttpUrl, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from longlink.shared.models import Email


class Env(BaseSettings):
    """Define startup-validated settings for one LongLink Platform API replica."""

    # Runtime scheduling
    OPERATION_TIMEOUT_SECONDS: int = Field(default=600, ge=60, le=1740)
    DATABASE_IDLE_SECONDS: int = Field(default=300, ge=300, le=604800)
    VERSION: str = Field(default="v0.0.0", pattern=r"^v[0-9]+\.[0-9]+\.[0-9]+(?:-.+)?$")

    # Authentication
    PUBLIC_URL: str = Field(default="http://localhost:5173", pattern=r"^https?://")
    SESSION_KEY: str = Field(min_length=32)
    AUTH_SESSION_LIFETIME_SECONDS: int = Field(default=2592000, ge=300, le=31536000)
    DEPLOYMENT_TOKEN: str | None = Field(default=None, min_length=32)
    GITHUB_OAUTH_CLIENT_ID: str | None = Field(default=None, min_length=1)
    GOOGLE_OAUTH_CLIENT_ID: str | None = Field(default=None, min_length=1)
    GITHUB_OAUTH_CLIENT_SECRET: str | None = Field(default=None, min_length=1)
    GOOGLE_OAUTH_CLIENT_SECRET: str | None = Field(default=None, min_length=1)

    # Initial Platform administrator
    ADMIN_NAME: str = Field(min_length=1)
    ADMIN_EMAIL: Email
    ADMIN_PASSWORD: str = Field(min_length=1)

    # Authentication email delivery
    SMTP_FROM: Email = "no-reply@longlink.dev"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_TRANSPORT: Literal["plain", "starttls", "tls"] = "starttls"
    SMTP_PASSWORD: str | None = None
    SMTP_USERNAME: str | None = None

    # Encryption for infrastructure credentials persisted by the Platform
    ENCRYPTION_KEY: str = Field(min_length=32)

    # Control plane database URL
    DATABASE_URL: str

    # Administrator-controlled registry origins, keyed by the image registry name.
    IMAGE_REGISTRIES: dict[str, HttpUrl] = Field(default_factory=lambda: {"ghcr.io": HttpUrl("https://ghcr.io")})

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_parse_none_str="null",
        extra="ignore",
    )

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

        # All authentication workflows use a real SMTP server, including local mail capture.
        if self.SMTP_HOST is None or not self.SMTP_HOST.strip():
            raise ValueError("SMTP_HOST is required")

        # Authenticated SMTP requires a complete credential pair and a delivery host.
        if (self.SMTP_USERNAME is None) != (self.SMTP_PASSWORD is None):
            raise ValueError("SMTP_USERNAME and SMTP_PASSWORD must be configured together")

        # Registry configuration must contain only credential-free origins; requests cannot supply new destinations.
        for url in self.IMAGE_REGISTRIES.values():
            if url.username is not None or url.password is not None or url.path not in {None, "/"} or url.query or url.fragment:
                raise ValueError("IMAGE_REGISTRIES must contain origins without credentials, path, query, or fragment")

        # OAuth providers require both confidential client credentials before their routes are enabled.
        if (self.GOOGLE_OAUTH_CLIENT_ID is None) != (self.GOOGLE_OAUTH_CLIENT_SECRET is None):
            raise ValueError("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together")
        if (self.GITHUB_OAUTH_CLIENT_ID is None) != (self.GITHUB_OAUTH_CLIENT_SECRET is None):
            raise ValueError("GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET must be configured together")

        return self

    def trusted_origins(self) -> set[str]:
        """Return the browser origins allowed to perform cookie-authenticated requests."""

        # Trust only the configured frontend origin in every environment.
        return {self.PUBLIC_URL.rstrip("/")}


env = Env()
