from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, those are all ENV"""

    # Organization specitic settings that can be re-used in the tools
    ORG_NAME: str
    # ORG_COUNTRY: str
    # ORG_ID: str
    # ORG_NAME: str
    # ORG_SECTOR: str
    
    DATABASE_URL: str

    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None
    
    model_config = SettingsConfigDict(
        env_file=('.env', '.env.sample'),
        env_file_encoding='utf-8'
    )


settings = Settings()
