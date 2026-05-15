from __future__ import annotations

import psycopg
from psycopg import sql
from src.env import env


class Root:
    """Database adapter root."""

    def __init__(self) -> None:
        """Initialize the database adapter root."""
        self._kwargs: dict[str, str | int] = {
            "host": env.DATABASE_HOST,
            "port": env.DATABASE_PORT,
            "user": env.DATABASE_USERNAME,
            "password": env.DATABASE_PASSWORD,
            "dbname": env.DATABASE_MAINTENANCE_DATABASE,
        }
        if env.DATABASE_SSLMODE:
            self._kwargs["sslmode"] = env.DATABASE_SSLMODE

    async def list(self) -> list[str]:
        """List non-template databases in the PostgreSQL cluster."""
        query = "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
        async with await psycopg.AsyncConnection.connect(**self._kwargs) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(query)
                rows = await cursor.fetchall()

        return [row[0] for row in rows]

    async def create(self, database_name: str) -> None:
        """Create one database."""
        async with await psycopg.AsyncConnection.connect(**self._kwargs) as conn:
            conn.autocommit = True
            async with conn.cursor() as cursor:
                await cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
                )

    async def delete(self, database_name: str) -> None:
        """Delete one database."""
        async with await psycopg.AsyncConnection.connect(**self._kwargs) as conn:
            conn.autocommit = True
            async with conn.cursor() as cursor:
                # Drop active sessions first so the database can be removed cleanly.
                await cursor.execute(
                    """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = %s AND pid <> pg_backend_pid()
                    """,
                    (database_name,),
                )
                await cursor.execute(
                    sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(database_name))
                )


root = Root()
