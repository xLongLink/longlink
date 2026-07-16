from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Envs(BaseSettings):
    """SDK environment model loaded from process variables only (no `.env` file)."""

    model_config = SettingsConfigDict(env_prefix="LONGLINK_")

    # Runtime
    ENV: Literal["development", "testing", "production"] = "development"

    # Database
    DATABASE_HOST: str | None = None
    DATABASE_NAME: str | None = None
    DATABASE_PORT: int | None = None
    DATABASE_SCHEMA: str | None = None
    DATABASE_PASSWORD: str | None = None
    DATABASE_SSLMODE: Literal["disable", "allow", "prefer", "require", "verify-ca", "verify-full"] = "require"
    DATABASE_USERNAME: str | None = None

    # Storage
    STORAGE_BUCKET: str | None = None
    STORAGE_PASSWORD: str | None = None
    STORAGE_USERNAME: str | None = None
    STORAGE_ENDPOINT_URL: str | None = None
    STORAGE_SHARED_BUCKET: str | None = None
