import re
import hashlib
from sqlalchemy import text, create_engine
from src.databases.__root__ import Database


class PostgreSQL(Database):
    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str,
        password: str,
        admin_database: str = 'postgres',
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.admin_database = admin_database

    @property
    def control_plane_url(self) -> str:
        return (
            f'postgresql://{self.username}:{self.password}'
            f'@{self.host}:{self.port}/{self.admin_database}'
        )

    def create(self, app_id: str) -> str:
        database_name = self._database_name(app_id)

        with create_engine(self.control_plane_url, isolation_level='AUTOCOMMIT').connect() as conn:
            result = conn.execute(
                text('SELECT 1 FROM pg_database WHERE datname = :database_name'),
                {'database_name': database_name},
            )
            already_exists = result.scalar() == 1
            if not already_exists:
                conn.execute(text(f'CREATE DATABASE "{database_name}"'))

        return database_name

    def delete(self, app_id: str) -> None:
        database_name = self._database_name(app_id)

        with create_engine(self.control_plane_url, isolation_level='AUTOCOMMIT').connect() as conn:
            conn.execute(
                text(
                    """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = :database_name
                      AND pid <> pg_backend_pid()
                    """
                ),
                {'database_name': database_name},
            )
            conn.execute(text(f'DROP DATABASE IF EXISTS "{database_name}"'))

    def credentials(self, app_id: str) -> dict[str, str | int]:
        database_name = self._database_name(app_id)
        return {
            'type': 'postgresql',
            'host': self.host,
            'port': self.port,
            'name': database_name,
            'username': self.username,
            'password': self.password,
            'connection_url': (
                f'postgresql://{self.username}:{self.password}'
                f'@{self.host}:{self.port}/{database_name}'
            ),
        }

    def _database_name(self, app_id: str) -> str:
        safe = re.sub(r'[^a-zA-Z0-9_]+', '_', app_id).strip('_').lower()
        if not safe:
            safe = 'app'

        digest = hashlib.sha1(app_id.encode()).hexdigest()[:8]
        prefix = f'app_{safe}'

        if len(prefix) > 54:
            prefix = prefix[:54].rstrip('_')

        return f'{prefix}_{digest}'
