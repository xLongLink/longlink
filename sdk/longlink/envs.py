import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Envs(BaseSettings):
    """App specific secrets"""

    DEV: bool = False

    # LongLink internal
    # The application key, used to identify the application in the API
    LLURL: str    # Example: 'sample.longlink.ch'
    LLKEY: str    # Example: 'samplekey'

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
    LLURL: str = 'http://localhost:8000'
    LLKEY: str = 'longlink-dev'
    DBURL: str = 'sqlite:///./longlink-dev.db'
    storage_key: str = 'dev'
    storage_secret: str = 'dev'
    storage_endpoint: str = 'http://localhost:9000'


if os.getenv('DEV', '').lower() in {'1', 'true', 'yes', 'on'}:
    envs = EnvsDev()  # type: ignore
else:
    envs = Envs()  # type: ignore
