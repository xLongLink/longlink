from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    """API Configuration
    
    1) When the application starts, it will load the configurations from the enviroment variables or from the .env file.
    2) The settings are stored in the database, as well the envs and they can be overwrite the enviroment variables, this allows to change the settings without restarting the application.

    """
    # Secret key for signing the env in the database, 
    # this is the only env that is required to set and should be set to a random string in production
    KEY: str = '1234' 

    # Organization specific settings, those will be accessible to the sdk
    ORG_NAME: str | None = None
    ORG_NAME_LEGAL: str | None = None
    ORG_MAIL_CONTACT: str | None = None
    ORG_MAIL_SUPPORT: str | None = None
    ORG_PHONE: str | None = None
    ORG_WEBSITE: str | None = None
    ORG_ADDRESS: str | None = None
    ORG_LOGO: str | None = None

    # Environment variables, those can be in a .env file or 
    ENV_DATABASE_URL: str  = 'sqlite+aiosqlite:///./db.sqlite3'
    ENV_GITHUB_CLIENT_ID: str | None = None
    ENV_GITHUB_CLIENT_SECRET: str | None = None 
    
    model_config = SettingsConfigDict(
        env_file=('.env'),
        env_file_encoding='utf-8'
    )

    def get(self, key: str) -> str | None:
        """Get a configuration value by key."""
        return getattr(self, key, None)

    def set(self, key: str, value: str) -> None:
        """Set a configuration value by key."""
        setattr(self, key, value)


config = Config() # type: ignore
