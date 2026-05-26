from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    # Run the API without serving static frontend files by default.
    HEADLESS: bool = True

    SESSION_KEY: str

    # Control plane database URL
    DATABASE_URL: str

    # OIDC bridge credentials
    OIDC_CLIENT_ID: str | None = None
    OIDC_CLIENT_SECRET: str | None = None
    OIDC_ISSUER: str | None = None
    OIDC_REDIRECT_URI: str

    # Web URL used for auth redirects
    URL: str

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.sample"),
        env_file_encoding="utf-8",
    )


env = Env()
