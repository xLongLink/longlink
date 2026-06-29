from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    SESSION_KEY: str

    # Control plane database URL
    DATABASE_URL: str

    # PostgreSQL adapter defaults.
    DATABASE_SSLMODE: str = "require"

    # OIDC bridge credentials
    OIDC_CLIENT_ID: str
    OIDC_CLIENT_SECRET: str
    OIDC_ISSUER: str
    OIDC_REDIRECT_URI: str

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.sample"),
        env_file_encoding="utf-8",
    )


env = Env()  # pyright: ignore[reportCallIssue]
