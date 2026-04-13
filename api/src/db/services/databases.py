import re
import asyncio
import psycopg2
from src.env import env
from psycopg2 import sql
from dataclasses import dataclass

_DATABASE_NAME_PATTERN = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')


@dataclass
class DatabaseProvisionConfig:
    host: str
    port: int
    username: str
    password: str
    maintenance_database: str
    sslmode: str | None


@dataclass
class DatabaseUsage:
    used_bytes: int | None
    free_bytes: int | None


class DatabasesService:
    def get_config(self) -> DatabaseProvisionConfig:
        if not env.ENV_PROVISION_DATABASE_HOST:
            raise ValueError('ENV_PROVISION_DATABASE_HOST is not configured')
        if not env.ENV_PROVISION_DATABASE_USERNAME:
            raise ValueError('ENV_PROVISION_DATABASE_USERNAME is not configured')
        if not env.ENV_PROVISION_DATABASE_PASSWORD:
            raise ValueError('ENV_PROVISION_DATABASE_PASSWORD is not configured')

        return DatabaseProvisionConfig(
            host=env.ENV_PROVISION_DATABASE_HOST,
            port=env.ENV_PROVISION_DATABASE_PORT,
            username=env.ENV_PROVISION_DATABASE_USERNAME,
            password=env.ENV_PROVISION_DATABASE_PASSWORD,
            maintenance_database=env.ENV_PROVISION_DATABASE_NAME,
            sslmode=env.ENV_PROVISION_DATABASE_SSLMODE,
        )

    async def usage(self) -> DatabaseUsage:
        config = self.get_config()
        return await asyncio.to_thread(self._usage_sync, config)

    async def create_database(self, *, database_name: str) -> None:
        if not _DATABASE_NAME_PATTERN.fullmatch(database_name):
            raise ValueError('Database name must start with a letter/underscore and contain only letters, numbers, and underscores')

        config = self.get_config()
        await asyncio.to_thread(self._create_database_sync, config, database_name)

    @staticmethod
    def _connection_kwargs(config: DatabaseProvisionConfig) -> dict[str, str | int]:
        connection_kwargs: dict[str, str | int] = {
            'host': config.host,
            'port': config.port,
            'user': config.username,
            'password': config.password,
            'dbname': config.maintenance_database,
        }
        if config.sslmode:
            connection_kwargs['sslmode'] = config.sslmode
        return connection_kwargs

    @staticmethod
    def _usage_sync(config: DatabaseProvisionConfig) -> DatabaseUsage:
        admin_connection = psycopg2.connect(**DatabasesService._connection_kwargs(config))
        try:
            with admin_connection.cursor() as cursor:
                cursor.execute('SELECT COALESCE(SUM(pg_database_size(datname)), 0) FROM pg_database WHERE datistemplate = false')
                used_bytes = cursor.fetchone()
                total_used = int(used_bytes[0]) if used_bytes and used_bytes[0] is not None else 0

            return DatabaseUsage(used_bytes=total_used, free_bytes=None)
        finally:
            admin_connection.close()

    @staticmethod
    def _create_database_sync(config: DatabaseProvisionConfig, database_name: str) -> None:
        admin_connection = psycopg2.connect(**DatabasesService._connection_kwargs(config))
        try:
            admin_connection.autocommit = True
            with admin_connection.cursor() as cursor:
                cursor.execute('SELECT 1 FROM pg_database WHERE datname = %s', (database_name,))
                if cursor.fetchone() is not None:
                    raise ValueError(f"Database '{database_name}' already exists")

                cursor.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database_name)))
        finally:
            admin_connection.close()
