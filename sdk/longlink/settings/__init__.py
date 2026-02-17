from pydantic_settings import BaseSettings, SettingsConfigDict


# ORG_ Are organizations env
# APP_ Are application env

class Settings(BaseSettings):
    name: str = "LongLink App"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

