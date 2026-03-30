import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    '''Environment-backed API configuration loaded at startup.'''
    DEV: bool = False
    KEY: str = '1234'

    # Control plane database URL
    ENV_DATABASE_URL: str = 'sqlite+aiosqlite:///./dev.db'

    # OAuth credentials
    ENV_GITHUB_CLIENT_ID: str | None = None
    ENV_GITHUB_CLIENT_SECRET: str | None = None

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


class DevEnv(Env):
    DEV: bool = True
    KEY: str = '1234'

    # Control plane database URL
    ENV_DATABASE_URL: str = 'sqlite+aiosqlite:///./dev.db'

    # OAuth credentials
    ENV_GITHUB_CLIENT_ID: str | None = None
    ENV_GITHUB_CLIENT_SECRET: str | None = None

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


# Load environment configuration
if os.getenv('DEV', 'False').lower() in ('true', '1', 'yes'):
    env = DevEnv()
else:
    env = Env()
