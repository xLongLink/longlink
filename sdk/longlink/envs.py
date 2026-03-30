from pydantic_settings import BaseSettings, SettingsConfigDict


class Envs(BaseSettings):
    """App specific secrets"""
    DEV: bool = False

    # LongLink internal
    # The application key, used to identify the application in the API
    LLURL: str    # Example: "sample.longlink.ch"
    LLKEY: str    # Example: "samplekey"

    # The application specific database
    DBURL: str
    
    # The application specific storage
    storage_key: str
    storage_secret: str
    storage_endpoint: str

    # At runtime any changes to those values require a container restart.
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


envs = Envs() # type: ignore
