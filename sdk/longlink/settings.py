from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App specific settings, extend this class to add more settings."""

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


# settings = Settings()