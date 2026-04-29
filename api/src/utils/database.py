import psycopg
from psycopg import sql, errors
from src.env import env


class DatabaseAlreadyExistsError(ValueError):
    """Raised when trying to create a database that already exists."""


async def create(database_name: str) -> None:
    """Create a database in the provisioned PostgreSQL cluster."""
    connection_kwargs: dict[str, str | int] = {
        "host": env.ENV_DATABASE_HOST,
        "port": env.ENV_DATABASE_PORT,
        "user": env.ENV_DATABASE_USERNAME,
        "password": env.ENV_DATABASE_PASSWORD,
        "dbname": env.ENV_DATABASE_MAINTENANCE_DATABASE,
    }
    if env.ENV_DATABASE_SSLMODE:
        connection_kwargs["sslmode"] = env.ENV_DATABASE_SSLMODE

    try:
        async with await psycopg.AsyncConnection.connect(**connection_kwargs) as conn:
            conn.autocommit = True
            async with conn.cursor() as cursor:
                await cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
                )
    except errors.DuplicateDatabase as error:
        raise DatabaseAlreadyExistsError(
            f"Database '{database_name}' already exists"
        ) from error
