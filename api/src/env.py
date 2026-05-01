from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    """Environment-backed API configuration loaded at startup."""

    DEV: bool = False
    KEY: str
    ENV_ORGANIZATION_NAME: str

    # Control plane database URL
    ENV_DATABASE_URL: str

    # OIDC bridge credentials
    ENV_OIDC_CLIENT_ID: str | None = None
    ENV_OIDC_CLIENT_SECRET: str | None = None
    ENV_OIDC_ISSUER: str | None = None
    ENV_OIDC_REDIRECT_URI: str
    ENV_OIDC_SCOPES: str

    # Provisioning credentials (configured once, not stored in API DB)
    ENV_DATABASE_HOST: str
    ENV_DATABASE_PORT: int
    ENV_DATABASE_USERNAME: str
    ENV_DATABASE_PASSWORD: str
    ENV_DATABASE_MAINTENANCE_DATABASE: str
    ENV_DATABASE_SSLMODE: str | None = None

    ENV_STORAGE_ENDPOINT_URL: str
    ENV_STORAGE_ACCESS_KEY_ID: str
    ENV_STORAGE_SECRET_ACCESS_KEY: str
    ENV_STORAGE_REGION_NAME: str | None = None

    ENV_COMPUTE_URL: str
    ENV_COMPUTE_KUBE_CONFIG_PATH: str
    ENV_COMPUTE_NAMESPACE: str

    # Web URL used for auth redirects
    URL: str

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.sample"),
        env_file_encoding="utf-8",
    )


env = Env()
