import pytest
import pytest_asyncio
from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import text
from alembic.config import Config
from collections.abc import AsyncIterator
from longlink.shared import audit as shared_audit
from longlink.shared import migrations as shared_migrations
from sqlalchemy.engine import URL
from sqlalchemy.sql.dml import Insert
from sqlalchemy.dialects import postgresql
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from longlink.shared.migrations import migrate_database, migration_config


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


class FakeAuditConnection:
    """Capture one audit upsert and optionally emulate a database failure."""

    def __init__(self, executed: dict[str, object], error: RuntimeError | None) -> None:
        """Store the observable upsert result and configured failure."""

        self.executed = executed
        self.error = error

    async def __aenter__(self) -> "FakeAuditConnection":
        """Enter the fake transaction context."""

        return self

    async def __aexit__(self, *_args: object) -> None:
        """Exit the fake transaction context."""

    async def execute(self, statement: object, parameters: list[dict[str, object]]) -> None:
        """Record the upsert or raise the configured database error."""

        if self.error is not None:
            raise self.error
        self.executed["statement"] = statement
        self.executed["parameters"] = parameters


class FakeAuditEngine:
    """Provide a short-lived audit transaction and disposal tracking."""

    def __init__(self, error: RuntimeError | None = None) -> None:
        """Initialize observable state for one synchronization attempt."""

        self.error = error
        self.executed: dict[str, object] = {}
        self.disposed = False

    def begin(self) -> FakeAuditConnection:
        """Return a fake transaction connection."""

        return FakeAuditConnection(self.executed, self.error)

    async def dispose(self) -> None:
        """Record operation-scoped engine disposal."""

        self.disposed = True


@pytest_asyncio.fixture
async def postgres_engine(postgresql_url: URL) -> AsyncIterator[AsyncEngine]:
    """Provide one disposable PostgreSQL engine for a shared migration integration test."""

    engine = create_async_engine(postgresql_url)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest.mark.parametrize("database_url", ["postgresql://db/longlink", "sqlite+aiosqlite:///:memory:"])
def test_migration_config_rejects_non_asyncpg_postgresql_urls(database_url: str) -> None:
    """Reject shared migration URLs that cannot use the asyncpg driver."""

    # Act and assert
    with pytest.raises(ValueError, match="Shared migrations require a postgresql\\+asyncpg database URL"):
        migration_config(database_url)


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


async def test_migrate_database_upgrades_shared_schema_to_head(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run the shared Alembic upgrade through the asynchronous migration entrypoint."""

    # Arrange
    captured: dict[str, Config | str] = {}

    def upgrade(config: Config, target: str) -> None:
        """Capture the Alembic configuration submitted for upgrade."""

        captured["config"] = config
        captured["target"] = target

    monkeypatch.setattr(shared_migrations.command, "upgrade", upgrade)

    # Act
    await migrate_database("postgresql+asyncpg://control:secret@db/longlink")

    # Assert
    config = captured["config"]
    assert isinstance(config, Config)
    assert config.get_main_option("sqlalchemy.url") == "postgresql+asyncpg://control:secret@db/longlink"
    assert captured["target"] == "head"


async def test_empty_shared_audit_sync_does_not_create_an_engine(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat empty shared audit synchronization as a no-op."""

    # Arrange
    def fail_to_create_engine(*_args: object, **_kwargs: object) -> None:
        """Fail if an empty synchronization attempts database access."""

        pytest.fail("empty shared audit synchronization must not create an engine")

    monkeypatch.setattr(shared_audit, "create_async_engine", fail_to_create_engine)

    # Act
    await shared_audit.sync("postgresql+asyncpg://db/longlink", [])


async def test_shared_audit_sync_upserts_rows_and_disposes_engine(
    monkeypatch: pytest.MonkeyPatch,
    audit_user: Audit,
) -> None:
    """Upsert shared audit rows through a short-lived database engine."""

    # Arrange
    engine = FakeAuditEngine()
    monkeypatch.setattr(shared_audit, "create_async_engine", lambda *_args, **_kwargs: engine)

    # Act
    await shared_audit.sync("postgresql+asyncpg://db/longlink", [audit_user])

    # Assert
    statement = engine.executed["statement"]
    assert isinstance(statement, Insert)
    assert statement.table.name == "audit"
    compiled = str(statement.compile(dialect=postgresql.dialect()))
    assert "ON CONFLICT (id) DO UPDATE" in compiled
    assert "created_at = excluded.created_at" not in compiled
    assert "updated_at = excluded.updated_at" in compiled
    assert "deleted_at = excluded.deleted_at" in compiled
    assert engine.executed["parameters"] == [audit_user.model_dump()]
    assert engine.disposed is True


async def test_shared_audit_sync_disposes_engine_when_upsert_fails(
    monkeypatch: pytest.MonkeyPatch,
    audit_user: Audit,
) -> None:
    """Dispose the operation-scoped engine when shared audit synchronization fails."""

    # Arrange
    engine = FakeAuditEngine(RuntimeError("database unavailable"))
    monkeypatch.setattr(shared_audit, "create_async_engine", lambda *_args, **_kwargs: engine)

    # Act and assert
    with pytest.raises(RuntimeError, match="database unavailable"):
        await shared_audit.sync("postgresql+asyncpg://db/longlink", [audit_user])

    assert engine.disposed is True


@pytest.mark.integration
async def test_shared_migrations_use_postgresql_shared_schema(postgresql_url: URL, postgres_engine: AsyncEngine) -> None:
    """Migrate shared tables into the isolated PostgreSQL shared schema."""

    # Make an application schema the role default to prove migrations override it.
    async with postgres_engine.begin() as connection:
        await connection.execute(text("CREATE SCHEMA application"))
        await connection.execute(
            text(f"ALTER ROLE {postgresql_url.username} IN DATABASE {postgresql_url.database} SET search_path = application, public")
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

    # Match the shared schema search path used by the Platform database adapter.
    async with postgres_engine.begin() as connection:
        await connection.execute(
            text(f"ALTER ROLE {postgresql_url.username} IN DATABASE {postgresql_url.database} SET search_path = shared")
        )

    # Insert one active control-plane user through the public synchronization entrypoint.
    user_id = audit_user.id
    created_at = audit_user.created_at
    active_user = audit_user.model_copy(update={"avatar": ""})
    await shared_audit.sync(postgresql_url, [active_user])

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
    await shared_audit.sync(postgresql_url, [deactivated_user])

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
