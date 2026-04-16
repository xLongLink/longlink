import re
import asyncio
import psycopg2
from src.env import env
from psycopg2 import sql

_DATABASE_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


async def create(database_name: str) -> None:
    """Validate and create a database in provisioned PostgreSQL cluster."""
    if not _DATABASE_NAME_PATTERN.fullmatch(database_name):
        raise ValueError(
            "Database name must start with a letter/underscore and contain only letters, numbers, and underscores"
        )

    await asyncio.to_thread(_create_sync, database_name)


def _create_sync(database_name: str) -> None:
    """Create database in PostgreSQL maintenance database connection."""
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
            # Guard against duplicate DB names before CREATE DATABASE.
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database_name,))
            if cursor.fetchone() is not None:
                raise ValueError(f"Database '{database_name}' already exists")

            # Use SQL identifier escaping to prevent injection in DB name.
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
            )
    finally:
        admin_connection.close()
