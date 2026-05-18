from __future__ import annotations

import uuid
import asyncio
import psycopg
from psycopg import sql
from src.env import env
from .__root__ import Database
from contextlib import suppress


class Postgre(Database):
    """PostgreSQL database adapter."""

    def __init__(
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        sslmode: str | None = None,
        maintenance_database: str = "postgres",
    ) -> None:
        """Initialize the PostgreSQL database adapter."""
        self._kwargs: dict[str, str | int] = {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "dbname": maintenance_database,
        }
        self._maintenance_database = maintenance_database

        if sslmode:
            self._kwargs["sslmode"] = sslmode

    async def _ensure_organization_database(self, organization: str) -> None:
        """Create the organization database when it is missing."""
        async with await psycopg.AsyncConnection.connect(**self._kwargs) as conn:
            await conn.set_autocommit(True)
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s",
                    (organization,),
                )
                if await cursor.fetchone() is None:
                    await cursor.execute(
                        sql.SQL("CREATE DATABASE {}").format(sql.Identifier(organization))
                    )

    async def list(self, organization: str) -> list[str]:
        """List created schemas for an organization."""
        await self._ensure_organization_database(organization)

        query = """
            SELECT schema_name
            FROM information_schema.schemata
            WHERE catalog_name = %s
              AND schema_name NOT LIKE 'pg_%%'
              AND schema_name <> 'information_schema'
              AND schema_name <> 'public'
            ORDER BY schema_name
        """
        connection_kwargs = {**self._kwargs, "dbname": organization}
        async with await psycopg.AsyncConnection.connect(**connection_kwargs) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(query, (organization,))
                rows = await cursor.fetchall()

        return [row[0] for row in rows]

    async def create(self, organization: str, application: str) -> None:
        """Create one schema in the given organization for the given application."""
        await self._ensure_organization_database(organization)

        connection_kwargs = {**self._kwargs, "dbname": organization}
        async with await psycopg.AsyncConnection.connect(**connection_kwargs) as conn:
            await conn.set_autocommit(True)
            async with conn.cursor() as cursor:
                await cursor.execute(
                    sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(application))
                )

    async def remove(self, organization: str, application: str) -> None:
        """Delete one schema in the given organization for the given application."""
        await self._ensure_organization_database(organization)

        connection_kwargs = {**self._kwargs, "dbname": organization}
        async with await psycopg.AsyncConnection.connect(**connection_kwargs) as conn:
            await conn.set_autocommit(True)
            async with conn.cursor() as cursor:
                await cursor.execute(
                    sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(application))
                )

    async def delete(self, organization: str) -> None:
        """Delete the entire database for the given organization."""
        connection_kwargs = {**self._kwargs, "dbname": self._maintenance_database}
        async with await psycopg.AsyncConnection.connect(**connection_kwargs) as conn:
            await conn.set_autocommit(True)
            async with conn.cursor() as cursor:
                # Drop active sessions first so the database can be removed cleanly.
                await cursor.execute(
                    """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = %s AND pid <> pg_backend_pid()
                    """,
                    (organization,),
                )
                await cursor.execute(
                    sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(organization))
                )


root = Postgre(
    host=env.DATABASE_HOST,
    port=env.DATABASE_PORT,
    user=env.DATABASE_USERNAME,
    password=env.DATABASE_PASSWORD,
    sslmode=env.DATABASE_SSLMODE,
)


async def _smoke_test() -> None:
    """Exercise the PostgreSQL adapter against the local database server."""
    adapter = Postgre(
        host=env.DATABASE_HOST,
        port=env.DATABASE_PORT,
        user=env.DATABASE_USERNAME,
        password=env.DATABASE_PASSWORD,
        sslmode=env.DATABASE_SSLMODE,
    )
    maintenance_kwargs = {
        "host": env.DATABASE_HOST,
        "port": env.DATABASE_PORT,
        "user": env.DATABASE_USERNAME,
        "password": env.DATABASE_PASSWORD,
        "dbname": "postgres",
    }
    if env.DATABASE_SSLMODE:
        maintenance_kwargs["sslmode"] = env.DATABASE_SSLMODE

    organization = f"ll_smoke_{uuid.uuid4().hex[:12]}"
    application = f"app_{uuid.uuid4().hex[:8]}"

    try:
        schemas = await adapter.list(organization)
        assert application not in schemas, "fresh organization database should start empty"

        await adapter.create(organization, application)
        schemas = await adapter.list(organization)
        assert application in schemas, "schema should exist after create()"

        await adapter.remove(organization, application)
        schemas = await adapter.list(organization)
        assert application not in schemas, "schema should be removed by remove()"

        await adapter.create(organization, application)
        schemas = await adapter.list(organization)
        assert application in schemas, "schema should be recreated before delete()"

        await adapter.delete(organization)

        async with await psycopg.AsyncConnection.connect(**maintenance_kwargs) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s",
                    (organization,),
                )
                row = await cursor.fetchone()
                assert row is None, "organization database should be deleted"

        print("postgres smoke test passed")
    finally:
        # Clean up any leftover database if a check failed before delete() ran.
        with suppress(Exception):
            await adapter.delete(organization)


if __name__ == "__main__":
    asyncio.run(_smoke_test())
