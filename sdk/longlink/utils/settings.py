from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environments(BaseSettings):
    """SDK environment model loaded from process variables or `.env`."""
    ENV: Literal["development", "testing", "production"] = "development"

    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"

    STORAGE_PROTOCOL: str = "file"
    STORAGE_ENDPOINT_URL: str | None = None
    STORAGE_ACCESS_KEY_ID: str | None = None
    STORAGE_SECRET_ACCESS_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.sample"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
