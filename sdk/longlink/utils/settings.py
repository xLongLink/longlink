from fastapi import Request
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """SDK environment model loaded from process variables or `.env`."""

    DEV: bool = False
    KEY: str = "longlink"

    # Database
    DBURL: str | None = None

    # Storage
    storage_key: str = "dev"
    storage_secret: str = "dev"
    storage_endpoint: str = "http://localhost:9000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @model_validator(mode="after")
    def apply_dev_defaults(self):
        """Set local development defaults when DEV mode is enabled."""

        if self.DEV:
            self.DBURL = "sqlite:///./dev.db"
        return self



def get_env(request: Request):
    """Helper to access SDK environment settings from request context."""
    return request.app.state.env

