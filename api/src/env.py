from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    '''Environment-backed API configuration loaded at startup.'''

    KEY: str = '1234'
    ENV_DATABASE_URL: str = 'sqlite+aiosqlite:///./db.sqlite3'
    ENV_GITHUB_CLIENT_ID: str | None = None
    ENV_GITHUB_CLIENT_SECRET: str | None = None

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


env = Env()
