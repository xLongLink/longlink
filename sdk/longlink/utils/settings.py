from pydantic_settings import BaseSettings, SettingsConfigDict


class Environments(BaseSettings):
    """SDK environment model loaded from process variables or `.env`."""
    model_config = SettingsConfigDict(env_file=(".env", ".env.sample"),env_file_encoding="utf-8")


class Settings:
    """Internal SDK settings wrapper around loaded environments."""

    # Database
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_DBNAME: str
    DATABASE_USERNAME: str
    DATABASE_PASSWORD: str

    # Storage
    STORAGE_PROTOCOL: str = "file"
    STORAGE_ENDPOINT_URL: str | None
    STORAGE_ACCESS_KEY_ID: str | None
    STORAGE_SECRET_ACCESS_KEY: str | None


env = Settings()

