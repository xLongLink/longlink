import time
import pytest
import psycopg
from uuid import UUID
from datetime import UTC, datetime
from src.utils import names
from containers import DockerRuntimeContainer
from sqlalchemy import text
from docker.errors import DockerException
from tenant.models import User as TenantUser
from sqlalchemy.exc import SQLAlchemyError
from tenant.database import users as tenant_users
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import create_async_engine
from src.adapters.database.postgres import Postgres

pytestmark = pytest.mark.no_db
POSTGRES_PORT = 5432


def _wait_for_postgres(container: DockerRuntimeContainer, username: str, password: str, database: str) -> None:
    """Wait until the PostgreSQL container accepts connections."""

    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            with psycopg.connect(
                host=container.host(),
                port=container.port(POSTGRES_PORT),
                user=username,
                password=password,
                dbname=database,
                connect_timeout=1,
            ) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            return
        except psycopg.OperationalError:
            time.sleep(0.5)

    pytest.fail("PostgreSQL container did not become ready")


@pytest.mark.integration
async def test_postgres_adapter_manages_real_database_schema_runtime_role_and_cleanup() -> None:
    """Exercise the PostgreSQL adapter against a real PostgreSQL container."""

    container = DockerRuntimeContainer(
        "postgres:16-alpine",
        ports=[POSTGRES_PORT],
        environment={
            "POSTGRES_USER": "longlink",
            "POSTGRES_PASSWORD": "secret",
            "POSTGRES_DB": "postgres",
        },
    )
    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker is not available for PostgreSQL integration tests: {exc}")

    adapter = Postgres(
        host=container.host(),
        port=container.port(POSTGRES_PORT),
        username="longlink",
        password="secret",
    )
    runtime_engine = None
    organization_id = UUID("33333333-3333-3333-3333-333333333333")
    application_id = UUID("44444444-4444-4444-4444-444444444444")
    schema_name = application_id.hex

    try:
        _wait_for_postgres(container, "longlink", "secret", "postgres")
        active_user = TenantUser(
            id=UUID("11111111-1111-1111-1111-111111111111"),
            name="Owner User",
            email="owner@example.com",
            avatar="",
            role="owner",
            created_at=datetime(2026, 7, 1, tzinfo=UTC),
            updated_at=datetime(2026, 7, 1, tzinfo=UTC),
        )
        shared_schema_url = adapter.shared_schema_url(organization_id)
        database_name = organization_id.hex
        await adapter.prepare_organization_database(organization_id, shared_schema_url)
        await tenant_users.sync_url(shared_schema_url, [active_user])

        database_url = adapter.url(database_name)

        runtime_connection = await adapter.schema(organization_id, application_id)
        runtime_url = URL.create(
            "postgresql+psycopg",
            username=runtime_connection["username"],
            password=runtime_connection["password"],
            host=runtime_connection["host"],
            port=runtime_connection["port"],
            database=runtime_connection["database_name"],
        )
        runtime_engine = create_async_engine(runtime_url)
        async with runtime_engine.begin() as conn:
            await conn.execute(text("CREATE TABLE runtime_items (id integer PRIMARY KEY, name text)"))
            await conn.execute(text("INSERT INTO runtime_items (id, name) VALUES (1, 'Widget')"))
            shared_user = (
                await conn.execute(
                    text("SELECT email, role FROM shared.users WHERE id = :user_id"),
                    {"user_id": active_user.id},
                )
            ).mappings().one()

        inactive_at = datetime(2026, 7, 2, tzinfo=UTC)
        inactive_user = active_user.model_copy(update={"updated_at": inactive_at, "deleted_at": inactive_at})
        await tenant_users.sync_url(shared_schema_url, [inactive_user])

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
                        INSERT INTO shared.users (id, name, email, avatar, role, created_at, updated_at)
                        VALUES (:id, 'Bad User', 'bad@example.com', '', 'owner', now(), now())
                        """
                    ),
                    {"id": UUID("22222222-2222-2222-2222-222222222222")},
                )

        tables = await adapter.table_columns(database_name, schema_name)
        table_rows = await adapter.table_rows(database_name, schema_name, "runtime_items")
        schemas = await adapter.schemas(database_name)
        databases = await adapter.databases()
        schema_usage = await adapter.schema_usage(database_name)
        server_usage = await adapter.usage()

        await runtime_engine.dispose()
        runtime_engine = None
        await adapter.delete_schema(organization_id, application_id)
        schemas_after_delete = await adapter.schemas(database_name)
        await adapter.delete_database(organization_id)
        databases_after_delete = await adapter.databases()

        assert database_url.database == organization_id.hex
        assert runtime_connection["username"].startswith("longlink_")
        assert len(runtime_connection["username"]) <= 63
        assert shared_user == {"email": "owner@example.com", "role": "owner"}
        assert deleted_at is not None
        assert [table["name"] for table in tables] == ["runtime_items"]
        assert table_rows["rows"] == [{"id": "1", "name": "Widget"}]
        assert {schema_name, "shared"} <= set(schemas)
        assert database_name in databases
        assert {item["name"] for item in schema_usage} >= {schema_name, "shared"}
        assert server_usage["space_used"] > 0
        assert schema_name not in schemas_after_delete
        assert database_name not in databases_after_delete
    finally:
        if runtime_engine is not None:
            await runtime_engine.dispose()
        await adapter.delete_schema(organization_id, application_id)
        await adapter.delete_database(organization_id)
        container.stop()
