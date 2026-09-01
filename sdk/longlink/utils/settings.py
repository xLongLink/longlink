import re
from typing import Self, Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DATABASE_SCHEMA_PATTERN = re.compile(r"^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9a-f]{32})$")


class Envs(BaseSettings):
    """SDK environment model loaded from process variables only (no `.env` file)."""

    model_config = SettingsConfigDict(env_prefix="LONGLINK_")

    # Runtime
    ENV: Literal["development", "testing", "production"] = "development"
    IDENTITY_SECRET: str | None = None

    # Database
    DATABASE_HOST: str | None = None
    DATABASE_NAME: str | None = None
    DATABASE_PORT: int | None = None
    DATABASE_SCHEMA: str | None = None
    DATABASE_SSLMODE: Literal["disable", "require"] = "require"
    DATABASE_PASSWORD: str | None = None
    DATABASE_USERNAME: str | None = None

    # Storage
    STORAGE_BUCKET: str | None = None
    STORAGE_PREFIX: str | None = None
    STORAGE_REGION: str | None = None
    STORAGE_PASSWORD: str | None = None
    STORAGE_USERNAME: str | None = None
    STORAGE_ENDPOINT_URL: str | None = None

    @model_validator(mode="after")
    def validate_production_settings(self) -> Self:
        """Require the complete Platform runtime contract in production."""

        # Local environments supply their own SQLite and filesystem defaults.
        if self.ENV != "production":
            return self

        missing_settings = [
            name
            for name in (
                "DATABASE_HOST",
                "DATABASE_NAME",
                "DATABASE_PORT",
                "DATABASE_SCHEMA",
                "DATABASE_PASSWORD",
                "DATABASE_USERNAME",
                "STORAGE_BUCKET",
                "STORAGE_PREFIX",
                "STORAGE_REGION",
                "STORAGE_PASSWORD",
                "STORAGE_USERNAME",
                "STORAGE_ENDPOINT_URL",
                "IDENTITY_SECRET",
            )
            if (value := getattr(self, name)) is None or (isinstance(value, str) and not value.strip())
        ]
        if missing_settings:
            raise ValueError(f"Production settings are required: {', '.join(missing_settings)}")

        # PostgreSQL identifiers cannot be safely bound as query parameters.
        if self.DATABASE_SCHEMA is None or not DATABASE_SCHEMA_PATTERN.fullmatch(self.DATABASE_SCHEMA):
            raise ValueError("DATABASE_SCHEMA must be a valid PostgreSQL identifier")

        return self
