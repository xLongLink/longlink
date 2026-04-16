import re
import asyncio
import psycopg2
from src.env import env
from psycopg2 import sql

_DATABASE_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class DatabasesService:
    """Service for managing databases in the provisioned PostgreSQL cluster."""

    async def create_database(self, *, database_name: str) -> None:
        """Validate and create a new database."""
        if not _DATABASE_NAME_PATTERN.fullmatch(database_name):
            raise ValueError(
                "Database name must start with a letter/underscore and contain only letters, numbers, and underscores"
            )

        await asyncio.to_thread(self._create_database_sync, database_name)

    @staticmethod
    def _create_database_sync(database_name: str) -> None:
        """Create the database using psycopg2 (runs in thread to avoid blocking)."""
        connection_kwargs: dict[str, str | int] = {
            "host": env.ENV_PROVISION_DATABASE_HOST,
            "port": env.ENV_PROVISION_DATABASE_PORT,
            "user": env.ENV_PROVISION_DATABASE_USERNAME,
            "password": env.ENV_PROVISION_DATABASE_PASSWORD,
            "dbname": env.ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE,
        }
        if env.ENV_PROVISION_DATABASE_SSLMODE:
            connection_kwargs["sslmode"] = env.ENV_PROVISION_DATABASE_SSLMODE

        admin_connection = psycopg2.connect(**connection_kwargs)
        try:
            admin_connection.autocommit = True
            with admin_connection.cursor() as cursor:
                # Check if database already exists
                cursor.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s", (database_name,)
                )
                if cursor.fetchone() is not None:
                    raise ValueError(f"Database '{database_name}' already exists")

                # Create the database with parameterized identifier to prevent SQL injection
                cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
                )
        finally:
            admin_connection.close()
