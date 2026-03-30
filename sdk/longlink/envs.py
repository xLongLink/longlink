import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Envs(BaseSettings):
    """App specific secrets"""
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


class EnvsDev(Envs):
    DEV: bool = True
    KEY: str = 'longlink'

    DBURL: str = 'sqlite:///./dev.db'
    storage_key: str = 'dev'
    storage_secret: str = 'dev'
    storage_endpoint: str = 'http://localhost:9000'


@lru_cache(maxsize=1)
def get_envs() -> Envs:
    if os.getenv('DEV', '').lower() in {'1', 'true', 'yes', 'on'}:
        return EnvsDev()  # type: ignore

    return Envs()  # type: ignore


class _LazyEnvs:
    def __getattr__(self, item):
        return getattr(get_envs(), item)


envs = _LazyEnvs()
