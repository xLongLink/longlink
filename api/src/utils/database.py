import asyncio
import psycopg2
from src.env import env
from psycopg2 import sql, errors


class DatabaseAlreadyExistsError(ValueError):
    """Raised when trying to create a database that already exists."""


async def create(database_name: str) -> None:
    """Create a database in the provisioned PostgreSQL cluster."""
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

    try:
        with psycopg2.connect(**connection_kwargs) as admin_connection:
            admin_connection.autocommit = True
            with admin_connection.cursor() as cursor:
                # Use SQL identifier escaping to prevent injection in DB name.
                cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
                )
    except errors.DuplicateDatabase as error:
        raise DatabaseAlreadyExistsError(
            f"Database '{database_name}' already exists"
        ) from error
