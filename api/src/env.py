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
    ENV_OIDC_ISSUER: str | None = 'http://localhost:18080/realms/longlink-control-plane'
    ENV_OIDC_REDIRECT_URI: str = 'http://localhost:8000/auth/oidc'
    ENV_OIDC_SCOPES: str = 'openid profile email'

    # Web URL used for auth redirects
    URL: str = 'http://localhost:5173'

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


# Load environment configuration
if os.getenv('DEV', 'False').lower() in ('true', '1', 'yes'):
    env = DevEnv()
else:
    env = Env()
