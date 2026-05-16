from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    SESSION_KEY: str

    # Control plane database URL
    DATABASE_URL: str

    # OIDC bridge credentials
    OIDC_CLIENT_ID: str | None = None
    OIDC_CLIENT_SECRET: str | None = None
    OIDC_ISSUER: str | None = None
    OIDC_REDIRECT_URI: str
    OIDC_SCOPES: str

    # Provisioning credentials (configured once, not stored in API DB)
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_USERNAME: str
    DATABASE_PASSWORD: str
    DATABASE_SSLMODE: str | None = None

    STORAGE_ENDPOINT_URL: str
    STORAGE_ACCESS_KEY_ID: str
    STORAGE_SECRET_ACCESS_KEY: str
    STORAGE_PROTOCOL: str = "file"

    COMPUTE_URL: str
    COMPUTE_KUBE_CONFIG_PATH: str

    # Web URL used for auth redirects
    URL: str

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.sample"),
        env_file_encoding="utf-8",
    )


env = Env()
