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
