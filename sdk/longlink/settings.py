from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App specific settings, extend this class to add more settings."""

    # The application key, used to identify the application in the API
    ENV_APP_KEY: str

    # The application specific database
    ENV_DATABASE_URL: str
    
    # The application specific storage
    ENV_STORAGE_ENDPOINT: str
    ENV_STORAGE_TOKEN: str


    model_config = SettingsConfigDict(
        env_file=('.env.sample', '.env'),
        env_file_encoding='utf-8'
    )


# settings = Settings()