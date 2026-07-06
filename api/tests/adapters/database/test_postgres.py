import pytest
from uuid import UUID
from datetime import UTC, datetime
from tenant.models import User as TenantUser
from sqlalchemy import text
from docker.errors import DockerException
from sqlalchemy.exc import SQLAlchemyError
from testcontainers.postgres import PostgresContainer
from src.adapters.database.postgres import Postgres
from sqlalchemy.ext.asyncio import create_async_engine

pytestmark = pytest.mark.no_db


@pytest.mark.integration
async def test_postgres_adapter_manages_real_database_schema_runtime_role_and_cleanup() -> None:
    """Exercise the PostgreSQL adapter against a real PostgreSQL container."""

    container = PostgresContainer(
        "postgres:16-alpine",
        username="longlink",
        password="secret",
        dbname="postgres",
        driver="psycopg",
    )
    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker is not available for PostgreSQL integration tests: {exc}")

    adapter = Postgres(
        host=container.get_container_host_ip(),
        port=int(container.get_exposed_port(5432)),
        username="longlink",
        password="secret",
    )
    runtime_engine = None

    try:
        database_url = await adapter.database("acme")
        active_user = TenantUser(
            id=UUID("11111111-1111-1111-1111-111111111111"),
            name="Owner User",
            email="owner@example.com",
            avatar="",
            role_name="owner",
            created_at=datetime(2026, 7, 1, tzinfo=UTC),
            updated_at=datetime(2026, 7, 1, tzinfo=UTC),
        )
        await adapter.sync_users("acme", [active_user])

        runtime_url = await adapter.schema("acme", "dashboard")
        runtime_engine = create_async_engine(runtime_url)
        async with runtime_engine.begin() as conn:
            await conn.execute(text("CREATE TABLE runtime_items (id integer PRIMARY KEY, name text)"))
            await conn.execute(text("INSERT INTO runtime_items (id, name) VALUES (1, 'Widget')"))
            shared_user = (
                await conn.execute(
                    text("SELECT email, role_name FROM shared.users WHERE id = :user_id"),
                    {"user_id": active_user.id},
                )
            ).mappings().one()

        await adapter.sync_users("acme", [])
        maintenance_engine = create_async_engine(database_url)
        try:
            async with maintenance_engine.begin() as conn:
                deleted_at = (
                    await conn.execute(
                        text("SELECT deleted_at FROM shared.users WHERE id = :user_id"),
                        {"user_id": active_user.id},
                    )
                ).scalar_one()
        finally:
            await maintenance_engine.dispose()

        with pytest.raises(SQLAlchemyError):
            async with runtime_engine.begin() as conn:
                await conn.execute(
                    text(
                        """
                        INSERT INTO shared.users (id, name, email, avatar, role_name, created_at, updated_at)
                        VALUES (:id, 'Bad User', 'bad@example.com', '', 'owner', now(), now())
                        """
                    ),
                    {"id": UUID("22222222-2222-2222-2222-222222222222")},
                )

        tables = await adapter.tables("longlink_acme", "dashboard")
        schemas = await adapter.schemas("longlink_acme")
        databases = await adapter.databases()
        schema_usage = await adapter.schema_usage("longlink_acme")
        table_usage = await adapter.table_usage("longlink_acme", "dashboard", "runtime_items")
        server_usage = await adapter.usage()

        await runtime_engine.dispose()
        runtime_engine = None
        await adapter.delete_schema("acme", "dashboard")
        schemas_after_delete = await adapter.schemas("longlink_acme")
        await adapter.delete_database("acme")
        databases_after_delete = await adapter.databases()

        assert "longlink_acme" in database_url
        assert "longlink_acme_dashboard" in runtime_url
        assert shared_user == {"email": "owner@example.com", "role_name": "owner"}
        assert deleted_at is not None
        assert [table["name"] for table in tables] == ["runtime_items"]
        assert tables[0]["rows"] == [{"id": 1, "name": "Widget"}]
        assert {"dashboard", "shared"} <= set(schemas)
        assert "longlink_acme" in databases
        assert {item["name"] for item in schema_usage} >= {"dashboard", "shared"}
        assert table_usage is not None
        assert table_usage["name"] == "runtime_items"
        assert table_usage["space_used"] > 0
        assert server_usage["space_used"] > 0
        assert "dashboard" not in schemas_after_delete
        assert "longlink_acme" not in databases_after_delete
    finally:
        if runtime_engine is not None:
            await runtime_engine.dispose()
        await adapter.delete_schema("acme", "dashboard")
        await adapter.delete_database("acme")
        container.stop()
