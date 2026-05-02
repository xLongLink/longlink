from longlink import Settings
from pydantic import Field


class Env(Settings):
    """Project-specific environment model."""

    KEY: str = Field(default="longlink", validation_alias="ENV_APP_KEY")
    DBURL: str | None = Field(default=None, validation_alias="ENV_DATABASE_URL")
    storage_endpoint: str = Field(
        default="http://localhost:9000",
        validation_alias="ENV_STORAGE_ENDPOINT",
    )
    storage_secret: str = Field(default="dev", validation_alias="ENV_STORAGE_TOKEN")
    FEATURE_FLAG: bool
    EXTERNAL_API: str


env = Env()
