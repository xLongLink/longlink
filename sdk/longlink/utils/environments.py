from pydantic_settings import BaseSettings, SettingsConfigDict


class Environments(BaseSettings):
    """User-defined environment model loaded from `.env` files or process variables.

    Extend this class to declare custom fields (use ``Field(validation_alias=...)`` to
    bind shorter names to ``ENV_``-prefixed variables in ``.env``).
    """

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.sample"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
