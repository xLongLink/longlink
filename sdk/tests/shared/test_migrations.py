import sys
import pytest
import alembic
import importlib
import importlib.util
import pytest_asyncio
from uuid import UUID
from types import SimpleNamespace
from pathlib import Path
from datetime import UTC, datetime
from contextlib import nullcontext
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from collections.abc import AsyncIterator
from longlink.shared import audit as shared_audit
from longlink.shared import migrations as shared_migrations
from sqlalchemy.engine import URL
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from longlink.shared.migrations import migrate_database, migration_config


def load_shared_migration_environment(monkeypatch: pytest.MonkeyPatch, context: object) -> None:
    """Execute the shared Alembic environment with an isolated context module."""

    # Replace Alembic's runtime proxy before the environment selects its execution mode.
    module_name = "tests.shared.alembic_environment"
    environment_path = Path(shared_migrations.__file__).parent / "alembic" / "env.py"
    specification = importlib.util.spec_from_file_location(module_name, environment_path)
    assert specification is not None
    assert specification.loader is not None
    module = importlib.util.module_from_spec(specification)
    monkeypatch.setattr(alembic, "context", context)
    monkeypatch.setitem(sys.modules, module_name, module)
    specification.loader.exec_module(module)


@pytest.fixture
def audit_user() -> Audit:
    """Create one representative shared-audit user."""

    return Audit(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        name="Owner User",
        email="owner@example.com",
        role="owner",
        created_at=datetime(2026, 7, 6, 8, tzinfo=UTC),
        updated_at=datetime(2026, 7, 6, 8, tzinfo=UTC),
    )


@pytest_asyncio.fixture
async def postgres_engine(postgresql_url: URL) -> AsyncIterator[AsyncEngine]:
    """Provide one disposable PostgreSQL engine for a shared migration integration test."""

    engine = create_async_engine(postgresql_url)
    try:
        yield engine
    finally:
        await engine.dispose()


def test_migration_config_rejects_non_async_postgresql_urls() -> None:
    """Reject shared migration URLs without a supported async PostgreSQL driver."""

    # Act and assert
    with pytest.raises(ValueError, match="Shared migrations require an async PostgreSQL database URL"):
        migration_config("postgresql://db/longlink")


def test_migration_config_preserves_percent_encoded_credentials() -> None:
    """Build a usable Alembic configuration for a valid asyncpg URL."""

    # Arrange
    database_url = "postgresql+asyncpg://control:se%25cret@db/longlink"

    # Act
    config = migration_config(database_url)

    # Assert
    script_location = config.get_main_option("script_location")
    assert script_location is not None
    assert script_location.endswith("longlink/shared/alembic")
    assert config.get_main_option("sqlalchemy.url") == database_url


def test_migration_config_rejects_missing_packaged_resources(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject SDK installations that omit shared Alembic resources."""

    # Arrange
    monkeypatch.setattr(shared_migrations, "files", lambda _package: tmp_path)

    # Act and assert
    with pytest.raises(RuntimeError, match="could not be located"):
        shared_migrations.migration_config("postgresql+asyncpg://control:secret@db/longlink")


async def test_empty_shared_audit_sync_does_not_execute_sql() -> None:
    """Treat empty shared audit synchronization as a no-op on the supplied connection."""

    # An unopened connection fails if synchronization attempts SQL or starts a transaction.
    engine = create_async_engine("sqlite+aiosqlite://")
    try:
        conn = engine.connect()
        await shared_audit.sync(conn, [])
    finally:
        await engine.dispose()


async def test_shared_audit_sync_leaves_cleanup_to_caller_when_upsert_fails(audit_user: Audit) -> None:
    """Propagate SQL failures while leaving connection and transaction ownership with the caller."""

    # Missing shared tables cause a real SQL failure within a caller-owned transaction.
    engine = create_async_engine("sqlite+aiosqlite://")
    try:
        async with engine.connect() as conn:
            with pytest.raises(DBAPIError, match="no such table: audit"):
                async with conn.begin():
                    try:
                        await shared_audit.sync(conn, [audit_user])
                    finally:
                        assert not conn.closed
                        assert conn.in_transaction()

            # The caller's transaction context rolls back and leaves its connection usable.
            assert not conn.in_transaction()
            assert await conn.scalar(text("SELECT 1")) == 1
    finally:
        await engine.dispose()


@pytest.mark.integration
async def test_shared_migrations_use_postgresql_shared_schema(postgresql_url: URL, postgres_engine: AsyncEngine) -> None:
    """Migrate shared tables into the isolated PostgreSQL shared schema."""

    # Make a Solution schema the role default to prove migrations override it.
    async with postgres_engine.begin() as connection:
        await connection.execute(text("CREATE SCHEMA solution"))
        await connection.execute(
            text(f"ALTER ROLE {postgresql_url.username} IN DATABASE {postgresql_url.database} SET search_path = solution, public")
        )

    # Exercise migration idempotency through the SDK-owned async entrypoint.
    await migrate_database(postgresql_url)
    await migrate_database(postgresql_url)

    # Verify both SDK-owned tables exist only in the shared schema.
    async with postgres_engine.begin() as connection:
        table_locations = set(
            (
                await connection.execute(
                    text(
                        """
                        SELECT table_schema, table_name
                        FROM information_schema.tables
                        WHERE table_name IN ('audit', 'alembic_version')
                        """
                    )
                )
            ).tuples()
        )
    assert table_locations == {("shared", "audit"), ("shared", "alembic_version")}


@pytest.mark.integration
async def test_shared_user_sync_updates_one_postgresql_row(
    postgresql_url: URL,
    postgres_engine: AsyncEngine,
    audit_user: Audit,
) -> None:
    """Synchronize active and deactivated users into one shared PostgreSQL row."""

    # Prepare the shared schema through the public migration entrypoint.
    await migrate_database(postgresql_url)

    # Insert one active control-plane user through the public synchronization entrypoint.
    user_id = audit_user.id
    created_at = audit_user.created_at
    active_user = audit_user.model_copy(update={"avatar": ""})
    async with postgres_engine.begin() as connection:
        await connection.execute(text("SET LOCAL search_path TO shared"))
        await shared_audit.sync(connection, [active_user])

    # Upsert changed mutable fields and an explicit control-plane deactivation.
    deactivated_at = datetime(2026, 7, 7, 9, tzinfo=UTC)
    deactivated_user = active_user.model_copy(
        update={
            "name": "Updated User",
            "email": "updated@example.com",
            "avatar": "https://example.com/avatar.png",
            "role": "read",
            "created_at": datetime(2026, 7, 7, 8, tzinfo=UTC),
            "updated_at": deactivated_at,
            "deleted_at": deactivated_at,
        }
    )
    async with postgres_engine.begin() as connection:
        await connection.execute(text("SET LOCAL search_path TO shared"))
        await shared_audit.sync(connection, [deactivated_user])

    # Read the persisted row from its qualified shared table and verify no duplicate was created.
    async with postgres_engine.connect() as connection:
        result = await connection.execute(
            text(
                """
                SELECT id, name, email, avatar, role, created_at, updated_at, deleted_at
                FROM shared.audit
                WHERE id = :user_id
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().one()

    assert dict(row) == {
        "id": user_id,
        "name": "Updated User",
        "email": "updated@example.com",
        "avatar": "https://example.com/avatar.png",
        "role": "read",
        "created_at": created_at,
        "updated_at": deactivated_at,
        "deleted_at": deactivated_at,
    }


def test_shared_migration_environment_configures_offline_schema_bootstrap(monkeypatch: pytest.MonkeyPatch) -> None:
    """Emit shared-schema bootstrap SQL before offline migration output."""

    # Arrange
    calls: list[object] = []
    context = SimpleNamespace(
        config=SimpleNamespace(get_main_option=lambda _option: "postgresql+asyncpg://db/organization"),
        is_offline_mode=lambda: True,
        configure=lambda **kwargs: calls.append(("configure", kwargs)),
        begin_transaction=nullcontext,
        execute=lambda statement: calls.append(("execute", statement)),
        run_migrations=lambda: calls.append(("run_migrations",)),
    )

    # Act
    load_shared_migration_environment(monkeypatch, context)

    # Assert
    assert calls == [
        (
            "configure",
            {
                "url": "postgresql+asyncpg://db/organization",
                "literal_binds": True,
                "dialect_opts": {"paramstyle": "named"},
                "version_table_schema": "shared",
            },
        ),
        ("execute", "CREATE SCHEMA IF NOT EXISTS shared"),
        ("execute", "SET search_path TO shared"),
        ("run_migrations",),
    ]


def test_shared_migration_environment_rejects_missing_online_url(monkeypatch: pytest.MonkeyPatch) -> None:
    """Require the control plane to provide an organization database URL."""

    # Arrange
    context = SimpleNamespace(
        config=SimpleNamespace(get_main_option=lambda _option: None),
        is_offline_mode=lambda: False,
    )

    # Act and assert
    with pytest.raises(RuntimeError, match="Alembic sqlalchemy.url is not configured"):
        load_shared_migration_environment(monkeypatch, context)


def test_initial_shared_migration_downgrade_drops_only_audit_table(monkeypatch: pytest.MonkeyPatch) -> None:
    """Remove only the SDK-owned audit table when downgrading the shared schema."""

    # Arrange
    dropped_tables: list[str] = []
    revision = importlib.import_module("longlink.shared.alembic.versions.20260713_0001_initial")
    monkeypatch.setattr(revision.op, "drop_table", dropped_tables.append)

    # Act
    revision.downgrade()

    # Assert
    assert dropped_tables == ["audit"]
