from pydantic_settings import BaseSettings, SettingsConfigDict


# There are 3 types of settings:
# -> ENV_*: those are the one loaded from the enviroment, they are secrets that are used in the API only. 
# like the admin database credentials, authentications credentials, etc. They are not shared with the tools, and they are not used in the tools.
# -> ORG_*: those are the one loaded from the enviroment, they are

# Organization specitic settings that can be re-used in the tools
# ORG_NAME: str
# ORG_COUNTRY: str
# ORG_ID: str
# ORG_NAME: str
# ORG_SECTOR: str


class Settings(BaseSettings):
    """Api specific settings"""
    
    DATABASE_URL: str

    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None
    
    model_config = SettingsConfigDict(
        env_file=('.env.sample', '.env'),
        env_file_encoding='utf-8'
    )


settings = Settings() # type: ignore
