from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Envs(BaseSettings):
    """SDK environment model loaded from process variables only (no `.env` file)."""

    model_config = SettingsConfigDict(env_prefix="LONGLINK_")

    ENV: Literal["development", "testing", "production"] = "development"

    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    DATABASE_SCHEMA: str | None = None

    STORAGE_URL: str = "file://"
    STORAGE_BUCKET: str | None = None
    STORAGE_SHARED_BUCKET: str | None = None
