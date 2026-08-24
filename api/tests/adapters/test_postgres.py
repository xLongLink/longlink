import pytest
from uuid import UUID
from datetime import UTC, datetime
from containers import start_postgres
from sqlalchemy import text
from src.adapters import postgres
from sqlalchemy.exc import SQLAlchemyError
from collections.abc import AsyncIterator
from longlink.shared import audit as shared_audit
from src.models.types import DatabaseSSLMode
from sqlalchemy.engine import URL
from src.adapters.postgres import Postgres
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import create_async_engine

pytestmark = pytest.mark.no_db


@pytest.fixture
async def postgres_adapter() -> AsyncIterator[tuple[Postgres, UUID, UUID]]:
    """Provide one disposable PostgreSQL adapter with stable resource identifiers."""

    container = start_postgres("longlink", "secret", "postgres")
    organization_id = UUID("33333333-3333-3333-3333-333333333333")
    application_id = UUID("44444444-4444-4444-4444-444444444444")
    adapter = Postgres(
        host=container.host(),
        port=container.port(5432),
        username="longlink",
        password="secret",
        sslmode=DatabaseSSLMode.disable,
    )

    try:
        yield adapter, organization_id, application_id
    finally:
        try:
            await adapter.delete_schema(organization_id, application_id)
            await adapter.delete_database(organization_id)
        finally:
            container.stop()


@pytest.mark.integration
async def test_postgres_adapter_creates_idempotent_runtime_schema_with_readonly_audit_access(
    postgres_adapter: tuple[Postgres, UUID, UUID],
) -> None:
    """Provision a runtime schema with stable credentials and read-only audit access."""

    # Arrange
    adapter, organization_id, application_id = postgres_adapter
    active_user = Audit(
        id=UUID("11111111-1111-1111-1111-111111111111"),
        name="Owner User",
        email="owner@example.com",
        avatar="",
        role="owner",
        created_at=datetime(2026, 7, 1, tzinfo=UTC),
        updated_at=datetime(2026, 7, 1, tzinfo=UTC),
    )
    shared_schema_url = adapter.url(organization_id.hex, search_path="shared").render_as_string(hide_password=False)
    await adapter.prepare_organization_database(organization_id)
    await adapter.prepare_organization_database(organization_id)
    await shared_audit.sync(shared_schema_url, [active_user])
    runtime_password = "stable-runtime-password"

    # Act
    runtime_connection = await adapter.schema(organization_id, application_id, runtime_password)
    retried_runtime_connection = await adapter.schema(organization_id, application_id, runtime_password)
    runtime_url = URL.create(
        "postgresql+psycopg",
        username=runtime_connection["username"],
        password=runtime_connection["password"],
        host=runtime_connection["host"],
        port=runtime_connection["port"],
        database=runtime_connection["database_name"],
    )
    runtime_engine = create_async_engine(runtime_url)
    try:
        async with runtime_engine.begin() as connection:
            await connection.execute(text("CREATE TABLE runtime_items (id integer PRIMARY KEY, name text)"))
            await connection.execute(text("INSERT INTO runtime_items (id, name) VALUES (1, 'Widget')"))
            shared_user = (
                await connection.execute(
                    text("SELECT email, role FROM shared.audit WHERE id = :user_id"),
                    {"user_id": active_user.id},
                )
            ).mappings().one()

        with pytest.raises(SQLAlchemyError):
            async with runtime_engine.begin() as connection:
                await connection.execute(
                    text(
                        """
                        INSERT INTO shared.audit (id, name, email, avatar, role, created_at, updated_at)
                        VALUES (:id, 'Bad User', 'bad@example.com', '', 'owner', now(), now())
                        """
                    ),
                    {"id": UUID("22222222-2222-2222-2222-222222222222")},
                )
    finally:
        await runtime_engine.dispose()

    inactive_at = datetime(2026, 7, 2, tzinfo=UTC)
    inactive_user = active_user.model_copy(update={"updated_at": inactive_at, "deleted_at": inactive_at})
    await shared_audit.sync(shared_schema_url, [inactive_user])
    maintenance_engine = create_async_engine(adapter.url(organization_id.hex))
    try:
        async with maintenance_engine.begin() as connection:
            deleted_at = (
                await connection.execute(
                    text("SELECT deleted_at FROM shared.audit WHERE id = :user_id"),
                    {"user_id": active_user.id},
                )
            ).scalar_one()
    finally:
        await maintenance_engine.dispose()

    # Assert
    assert retried_runtime_connection == runtime_connection
    assert runtime_connection["password"] == runtime_password
    assert runtime_connection["sslmode"] == "disable"
    assert runtime_connection["username"].startswith("longlink_")
    assert len(runtime_connection["username"]) <= 63
    assert shared_user == {"email": "owner@example.com", "role": "owner"}
    assert deleted_at is not None


@pytest.mark.integration
async def test_postgres_adapter_removes_runtime_identity_and_tolerates_repeated_schema_cleanup(
    postgres_adapter: tuple[Postgres, UUID, UUID],
) -> None:
    """Remove runtime roles and schemas without requiring the role to remain present."""

    # Arrange
    adapter, organization_id, application_id = postgres_adapter
    await adapter.prepare_organization_database(organization_id)
    await adapter.schema(organization_id, application_id, "stable-runtime-password")

    # Act
    exists_before_cleanup = await adapter.application_runtime_identity_exists(organization_id, application_id)
    await adapter.delete_schema(organization_id, application_id)
    exists_after_cleanup = await adapter.application_runtime_identity_exists(organization_id, application_id)
    await adapter.delete_schema(organization_id, application_id)

    # Assert
    assert exists_before_cleanup is True
    assert exists_after_cleanup is False


@pytest.mark.integration
async def test_postgres_adapter_rejects_schema_provisioning_without_string_literal_support(
    postgres_adapter: tuple[Postgres, UUID, UUID], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Fail before composing a role password when the active dialect cannot quote strings."""

    # Arrange
    adapter, organization_id, application_id = postgres_adapter
    await adapter.prepare_organization_database(organization_id)
    monkeypatch.setattr(postgres.String, "literal_processor", lambda _self, _dialect: None)

    # Act and assert
    with pytest.raises(ValueError, match="^PostgreSQL string literal processing is unavailable$"):
        await adapter.schema(organization_id, application_id, "stable-runtime-password")


@pytest.mark.integration
async def test_postgres_adapter_reports_usage_before_and_after_cleanup(
    postgres_adapter: tuple[Postgres, UUID, UUID],
) -> None:
    """Report nonzero usage for provisioned resources and zero after deletion."""

    # Arrange
    adapter, organization_id, application_id = postgres_adapter
    database_name = organization_id.hex
    await adapter.prepare_organization_database(organization_id)
    await adapter.schema(organization_id, application_id, "stable-runtime-password")

    # Act
    database_usage = await adapter.database_usage(database_name)
    server_usage = await adapter.usage()
    await adapter.delete_schema(organization_id, application_id)
    await adapter.delete_database(organization_id)
    database_usage_after_delete = await adapter.database_usage(database_name)
    server_usage_after_delete = await adapter.usage()

    # Assert
    assert database_usage is not None
    assert database_usage > 0
    assert server_usage > 0
    assert database_usage_after_delete is None
    assert server_usage_after_delete == 0
