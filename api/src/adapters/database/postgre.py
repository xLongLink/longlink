from __future__ import annotations


import psycopg
from psycopg import conninfo
from psycopg import sql

from .__root__ import Database


class Postgre(Database):
    """PostgreSQL database adapter."""

    def __init__(
        self,
        connection: str,
        maintenance_database: str = "postgres",
    ) -> None:
        """Initialize the PostgreSQL database adapter.

        Args:
            connection: PostgreSQL connection string (libpq key=value format or URI).
            maintenance_database: Database to connect to for server-level operations.
        """
        self._connection = connection
        self._maintenance_database = maintenance_database
        self._maintenance_conn: psycopg.AsyncConnection | None = None

        # Parse connection info for user-facing connection values.
        info = conninfo.conninfo_to_dict(connection)
        self._host: str = str(info.get("host") or "localhost")
        self._port: int = int(info.get("port") or 5432)
        self._user: str = str(info.get("user") or "")
        self._password: str = str(info.get("password") or "")


    async def _ensure_maintenance_connection(self) -> psycopg.AsyncConnection:
        """Return a cached connection to the maintenance database."""
        if self._maintenance_conn is None or self._maintenance_conn.closed:
            self._maintenance_conn = await psycopg.AsyncConnection.connect(
                self._connection, dbname=self._maintenance_database
            )
            await self._maintenance_conn.set_autocommit(True)
        return self._maintenance_conn


    async def _ensure_organization_database(self, organization: str) -> None:
        """Create the organization database when it is missing."""
        conn = await self._ensure_maintenance_connection()
        async with conn.cursor() as cursor:
            await cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (organization,),
            )
            if await cursor.fetchone() is None:
                await cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(organization))
                )


    async def database(self, organization: str) -> str:
        """Create the organization database if it does not exist and return a connection DSN."""
        await self._ensure_organization_database(organization)
        return f"postgresql://{self._user}:{self._password}@{self._host}:{self._port}/{organization}"


    async def schema(self, organization: str, application: str) -> str:
        """Create or replace the schema for one application and return a connection DSN."""
        await self._ensure_organization_database(organization)

        async with await psycopg.AsyncConnection.connect(
            self._connection, dbname=organization
        ) as conn:
            await conn.set_autocommit(True)
            async with conn.cursor() as cursor:
                await cursor.execute(
                    sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                        sql.Identifier(application)
                    )
                )
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS public.users (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)

        return f"postgresql://{self._user}:{self._password}@{self._host}:{self._port}/{organization}"


    async def remove(self, organization: str, application: str) -> None:
        """Remove one application schema from the organization database."""
        async with await psycopg.AsyncConnection.connect(
            self._connection, dbname=organization
        ) as conn:
            await conn.set_autocommit(True)
            async with conn.cursor() as cursor:
                await cursor.execute(
                    sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(
                        sql.Identifier(application)
                    )
                )


    async def delete(self, organization: str) -> None:
        """Delete the entire database for the given organization."""
        conn = await self._ensure_maintenance_connection()
        async with conn.cursor() as cursor:
            await cursor.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid()
                """,
                (organization,),
            )
            await cursor.execute(
                sql.SQL("DROP DATABASE IF EXISTS {}").format(
                    sql.Identifier(organization)
                )
            )
