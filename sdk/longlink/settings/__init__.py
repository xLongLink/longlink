from pydantic_settings import BaseSettings, SettingsConfigDict


# ORG_ Are organizations env
# APP_ Are application env

class Settings(BaseSettings):
    app_name: str
    debug: bool = False
    database_url: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )


settings = Settings() # type: ignore

