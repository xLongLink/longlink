from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App specific settings, extend this class to add more settings."""
    
    # Envs are set when the application is created, all the other settings are saved in the runtime of the API
    # When the settings is created

    model_config = SettingsConfigDict(
        env_file=('.env.sample', '.env'),
        env_file_encoding='utf-8'
    )


settings = Settings() # type: ignore
