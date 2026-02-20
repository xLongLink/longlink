from pydantic_settings import BaseSettings, SettingsConfigDict


class Envs(BaseSettings):
    """App specific settings, extend this class to add more settings."""
    dev: bool = False

    # The application key, used to identify the application in the API
    key: str

    # The application specific database
    database_url: str
    
    # The application specific storage
    storage_key: str
    storage_secret: str
    storage_endpoint: str
    
    model_config = SettingsConfigDict(
        env_file=('.env.sample', '.env'),
        env_file_encoding='utf-8'
    )


envs = Envs() # type: ignore
