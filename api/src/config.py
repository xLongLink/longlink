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
    ORG_TAX_ID: str | None = None
    ORG_PHONE: str | None = None
    ORG_WEBSITE: str | None = None
    ORG_ADDRESS: str | None = None
    ORG_LOGO: str | None = None

    # Environment variables, those can be in a .env file or 
    ENV_DATABASE_URL: str  = 'sqlite+aiosqlite:///./db.sqlite3'
    ENV_GITHUB_CLIENT_ID: str | None = None
    ENV_GITHUB_CLIENT_SECRET: str | None = None 

    ORG_KEY_ALIASES: dict[str, str] = {
        'ORGANIZATION_NAME': 'ORG_NAME',
        'ORGANIZATION_LEGAL_NAME': 'ORG_NAME_LEGAL',
        'ORGANIZATION_PRIMARY_CONTACT_EMAIL': 'ORG_MAIL_CONTACT',
        'ORGANIZATION_SUPPORT_EMAIL': 'ORG_MAIL_SUPPORT',
        'ORGANIZATION_REGISTRATION_TAX_ID': 'ORG_TAX_ID',
        'ORGANIZATION_PHONE_NUMBER': 'ORG_PHONE',
        'ORGANIZATION_WEBSITE': 'ORG_WEBSITE',
        'ORGANIZATION_PHYSICAL_ADDRESS': 'ORG_ADDRESS',
        'ORGANIZATION_LOGO': 'ORG_LOGO',
    }
    
    model_config = SettingsConfigDict(
        env_file=('.env'),
        env_file_encoding='utf-8'
    )

    def get(self, key: str) -> str | None:
        """Get a configuration value by key."""
        normalized_key = self.normalize_key(key)
        return getattr(self, normalized_key, None)

    def set(self, key: str, value: str) -> None:
        """Set a configuration value by key."""
        normalized_key = self.normalize_key(key)
        if normalized_key in self.model_fields:
            setattr(self, normalized_key, value)

    def normalize_key(self, key: str) -> str:
        normalized_key = key.upper()
        return self.ORG_KEY_ALIASES.get(normalized_key, normalized_key)


config = Config() # type: ignore
