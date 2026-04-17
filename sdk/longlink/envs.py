import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class ENV(BaseSettings):
    """Base SDK environment model loaded from process variables or `.env`."""

    DEV: bool = False
    KEY: str  # Example: 'samplekey'

    # The application specific database
    DBURL: str

    # The application specific storage
    storage_key: str
    storage_secret: str
    storage_endpoint: str

    # At runtime any changes to those values require a container restart.
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


class ENVDev(ENV):
    """Development defaults for local execution."""

    DEV: bool = True
    KEY: str = 'longlink'

    DBURL: str = 'sqlite:///./dev.db'
    storage_key: str = 'dev'
    storage_secret: str = 'dev'
    storage_endpoint: str = 'http://localhost:9000'


def _is_dev_enabled() -> bool:
    """Return whether current process should load development defaults."""

    return os.getenv('DEV', '').lower() in {'1', 'true', 'yes', 'on'}


@lru_cache(maxsize=1)
def get_envs() -> ENV:
    """Load and cache default SDK environment for current process."""

    if _is_dev_enabled():
        return ENVDev()  # type: ignore[return-value]

    return ENV()  # type: ignore[return-value]


# Backwards-compatible aliases while SDK moves to `ENV` naming.
Envs = ENV
EnvsDev = ENVDev

# Default process-level SDK environment.
envs: ENV = get_envs()
