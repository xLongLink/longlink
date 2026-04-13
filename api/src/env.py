import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    '''Environment-backed API configuration loaded at startup.'''
    DEV: bool = False
    KEY: str = '1234'

    # Control plane database URL
    ENV_DATABASE_URL: str = 'sqlite+aiosqlite:///./dev.db'

    # OIDC bridge credentials
    ENV_OIDC_CLIENT_ID: str | None = None
    ENV_OIDC_CLIENT_SECRET: str | None = None
    ENV_OIDC_ISSUER: str | None = None
    ENV_OIDC_REDIRECT_URI: str = 'http://localhost:8000/auth/oidc'
    ENV_OIDC_SCOPES: str = 'openid profile email'

    # Provisioning credentials (configured once, not stored in API DB)
    ENV_PROVISION_DATABASE_HOST: str = 'localhost'
    ENV_PROVISION_DATABASE_PORT: int = 5432
    ENV_PROVISION_DATABASE_USERNAME: str = 'admin'
    ENV_PROVISION_DATABASE_PASSWORD: str = 'admin'
    ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE: str = 'postgres'
    ENV_PROVISION_DATABASE_SSLMODE: str | None = None

    ENV_PROVISION_STORAGE_ENDPOINT_URL: str = 'http://localhost:9000'
    ENV_PROVISION_STORAGE_ACCESS_KEY_ID: str = 'admin'
    ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY: str = 'admin'
    ENV_PROVISION_STORAGE_REGION_NAME: str | None = 'us-east-1'

    ENV_PROVISION_COMPUTE_API_SERVER_URL: str = 'http://localhost:8001'
    ENV_PROVISION_COMPUTE_ADMIN_USERNAME: str = 'admin'
    ENV_PROVISION_COMPUTE_ADMIN_PASSWORD: str = 'admin'
    ENV_PROVISION_COMPUTE_DEFAULT_NAMESPACE: str = 'default'
    ENV_PROVISION_COMPUTE_VERIFY_SSL: bool = False

    # Web URL used for auth redirects
    URL: str = 'http://localhost:5173'

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


class DevEnv(Env):
    DEV: bool = True
    KEY: str = '1234'

    # Control plane database URL
    ENV_DATABASE_URL: str = 'sqlite+aiosqlite:///./dev.db'

    # OIDC bridge credentials
    ENV_OIDC_CLIENT_ID: str | None = 'longlink-api'
    ENV_OIDC_CLIENT_SECRET: str | None = 'longlink-secret'
    ENV_OIDC_ISSUER: str | None = 'http://localhost:18080/realms/dev'
    ENV_OIDC_REDIRECT_URI: str = 'http://localhost:8000/auth/oidc'
    ENV_OIDC_SCOPES: str = 'openid profile email'

    # Provisioning credentials (configured once, not stored in API DB)
    ENV_PROVISION_DATABASE_HOST: str = 'localhost'
    ENV_PROVISION_DATABASE_PORT: int = 15432
    ENV_PROVISION_DATABASE_USERNAME: str = 'admin'
    ENV_PROVISION_DATABASE_PASSWORD: str = 'admin'
    ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE: str = 'postgres'
    ENV_PROVISION_DATABASE_SSLMODE: str | None = None

    ENV_PROVISION_STORAGE_ENDPOINT_URL: str = 'http://localhost:19000'
    ENV_PROVISION_STORAGE_ACCESS_KEY_ID: str = 'admin'
    ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY: str = 'admin'
    ENV_PROVISION_STORAGE_REGION_NAME: str | None = 'us-east-1'

    ENV_PROVISION_COMPUTE_API_SERVER_URL: str = 'http://localhost:8001'
    ENV_PROVISION_COMPUTE_ADMIN_USERNAME: str = 'admin'
    ENV_PROVISION_COMPUTE_ADMIN_PASSWORD: str = 'admin'
    ENV_PROVISION_COMPUTE_DEFAULT_NAMESPACE: str = 'default'
    ENV_PROVISION_COMPUTE_VERIFY_SSL: bool = False

    # Web URL used for auth redirects
    URL: str = 'http://localhost:5173'

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


# Load environment configuration
if os.getenv('DEV', 'False').lower() in ('true', '1', 'yes'):
    env = DevEnv()
else:
    env = Env()
