import pytest
from uuid import UUID
from datetime import UTC, datetime
from src.utils import postgres
from containers import postgres_container
from contextlib import ExitStack
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from collections.abc import Iterator
from longlink.shared import audit as shared_audit
from src.models.types import DatabaseSSLMode
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import create_async_engine

pytestmark = pytest.mark.no_db


@pytest.fixture
def postgres_database() -> Iterator[tuple[postgres.Postgres, UUID, UUID]]:
    """Provide SQL provisioning against a disposable PostgreSQL database."""

    with postgres_container("longlink", "secret", "postgres") as container:
        organization_id = UUID("33333333-3333-3333-3333-333333333333")
        solution_id = UUID("44444444-4444-4444-4444-444444444444")
        adapter = postgres.Postgres(
            host=container.get_container_host_ip(),
            port=container.get_exposed_port(5432),
            username="longlink",
            password="secret",
            sslmode=DatabaseSSLMode.disable,
        )

        yield adapter, organization_id, solution_id


@pytest.mark.integration
async def test_postgres_creates_idempotent_runtime_schema_with_readonly_audit_access(
    postgres_database: tuple[postgres.Postgres, UUID, UUID],
    request: pytest.FixtureRequest,
) -> None:
    """Provision a runtime schema with stable credentials and read-only audit access."""

    # Arrange
    adapter, organization_id, solution_id = postgres_database
    active_user = Audit(
        id=UUID("11111111-1111-1111-1111-111111111111"),
        name="Owner User",
        email="owner@example.com",
        avatar="",
        role="owner",
        created_at=datetime(2026, 7, 1, tzinfo=UTC),
        updated_at=datetime(2026, 7, 1, tzinfo=UTC),
    )
    urls = ExitStack()
    request.addfinalizer(urls.close)
    shared_schema_url = urls.enter_context(adapter.url(organization_id.hex, search_path="shared"))
    await adapter.prepare_organization_database(organization_id)
    await adapter.prepare_organization_database(organization_id)
    await shared_audit.sync(shared_schema_url, [active_user])
    runtime_password = "stable-runtime-password"

    # Act
    runtime_username = await adapter.solution_schema(organization_id, solution_id, runtime_password)
    retried_runtime_username = await adapter.solution_schema(organization_id, solution_id, runtime_password)
    runtime_url = urls.enter_context(adapter.url(organization_id.hex)).set(username=runtime_username, password=runtime_password)
    runtime_engine = create_async_engine(runtime_url)
    try:
        async with runtime_engine.begin() as connection:
            await connection.execute(text("CREATE TABLE runtime_items (id integer PRIMARY KEY, name text)"))
            await connection.execute(text("INSERT INTO runtime_items (id, name) VALUES (1, 'Widget')"))
            shared_user = (
                (
                    await connection.execute(
                        text("SELECT email, role FROM shared.audit WHERE id = :user_id"),
                        {"user_id": active_user.id},
                    )
                )
                .mappings()
                .one()
            )

        with pytest.raises(DBAPIError) as error:
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
    maintenance_engine = create_async_engine(urls.enter_context(adapter.url(organization_id.hex)))
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
    assert getattr(error.value.orig, "sqlstate", None) == "42501"
    assert retried_runtime_username == runtime_username
    assert runtime_username.startswith("longlink_")
    assert len(runtime_username) <= 63
    assert shared_user == {"email": "owner@example.com", "role": "owner"}
    assert deleted_at == inactive_at


@pytest.mark.integration
async def test_postgres_removes_runtime_identity_and_tolerates_repeated_schema_cleanup(
    postgres_database: tuple[postgres.Postgres, UUID, UUID],
) -> None:
    """Remove runtime roles and schemas without requiring the role to remain present."""

    # Arrange
    adapter, organization_id, solution_id = postgres_database
    await adapter.prepare_organization_database(organization_id)
    runtime_username = await adapter.solution_schema(organization_id, solution_id, "stable-runtime-password")

    # Act
    async with adapter._connection("postgres") as conn:
        role_before_cleanup = await conn.scalar(text("SELECT rolname FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})
    await adapter.delete_solution_schema(organization_id, solution_id)
    await adapter.delete_solution_schema(organization_id, solution_id)
    async with adapter._connection("postgres") as conn:
        role_after_cleanup = await conn.scalar(text("SELECT rolname FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})

    # Assert
    assert role_before_cleanup == runtime_username
    assert role_after_cleanup is None


@pytest.mark.integration
async def test_postgres_rejects_schema_provisioning_without_string_literal_support(
    postgres_database: tuple[postgres.Postgres, UUID, UUID], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Fail before composing a role password when the active dialect cannot quote strings."""

    # Arrange
    adapter, organization_id, solution_id = postgres_database
    await adapter.prepare_organization_database(organization_id)
    monkeypatch.setattr(postgres.String, "literal_processor", lambda _self, _dialect: None)

    # Act and assert
    with pytest.raises(ValueError, match=r"^PostgreSQL string literal processing is unavailable$"):
        await adapter.solution_schema(organization_id, solution_id, "stable-runtime-password")


@pytest.mark.integration
async def test_postgres_reports_usage_for_present_and_missing_databases(
    postgres_database: tuple[postgres.Postgres, UUID, UUID],
) -> None:
    """Report nonzero usage for a provisioned database and None for a missing database."""

    # Arrange
    adapter, organization_id, _ = postgres_database
    missing_organization_id = UUID("55555555-5555-5555-5555-555555555555")
    await adapter.prepare_organization_database(organization_id)

    # Act
    database_usage = await adapter.database_usage(organization_id.hex)
    missing_database_usage = await adapter.database_usage(missing_organization_id.hex)

    # Assert
    assert database_usage is not None
    assert database_usage > 0
    assert missing_database_usage is None
