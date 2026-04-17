import os
from pathlib import Path
from longlink import Enviroments
from pydantic import Field
from pydantic_settings import SettingsConfigDict


def _resolve_env_file() -> Path:
    """Select sample env source based on DEV flag."""

    sample_root = Path(__file__).resolve().parents[1]
    # Use development sample env only when DEV flag explicitly enabled.
    if os.getenv("DEV", "").lower() in {"1", "true", "yes", "on"}:
        return sample_root / ".env.sample"
    return sample_root / ".env"


class Env(Enviroments):
    """Project-specific environment model."""

    KEY: str = Field(default="longlink", validation_alias="ENV_APP_KEY")
    DBURL: str | None = Field(default=None, validation_alias="ENV_DATABASE_URL")
    storage_endpoint: str = Field(
        default="http://localhost:9000",
        validation_alias="ENV_STORAGE_ENDPOINT",
    )
    storage_secret: str = Field(default="dev", validation_alias="ENV_STORAGE_TOKEN")
    FEATURE_FLAG: bool
    EXTERNAL_API: str
    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
    )


env = Env(_env_file=_resolve_env_file())
