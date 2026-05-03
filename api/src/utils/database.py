import psycopg
from psycopg import sql
from src.env import env


async def create(database_name: str) -> None:
    """Create a database in the provisioned PostgreSQL cluster."""
    kwargs: dict[str, str | int] = {
        "host": env.DATABASE_HOST,
        "port": env.DATABASE_PORT,
        "user": env.DATABASE_USERNAME,
        "password": env.DATABASE_PASSWORD,
        "dbname": env.DATABASE_MAINTENANCE_DATABASE,
    }
    if env.DATABASE_SSLMODE:
        kwargs["sslmode"] = env.DATABASE_SSLMODE

    async with await psycopg.AsyncConnection.connect(**kwargs) as conn:
        conn.autocommit = True
        async with conn.cursor() as cursor:
            await cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
            )
