import pytest
import asyncio
from typing import ClassVar
from sqlmodel import Field
from longlink.database import base as database_base
from longlink.database import urls as database_urls
from sqlalchemy.ext.asyncio import create_async_engine
from longlink.utils.settings import Envs


@pytest.fixture
def reset_session_factory(monkeypatch: pytest.MonkeyPatch) -> None:
    """Clear the global SDK session factory before each lazy-session test."""

    monkeypatch.setattr(database_base, "Session", None)


@pytest.mark.parametrize("database_schema", ["application-schema", "public; DROP SCHEMA shared", '"application"'])
def test_production_settings_reject_invalid_database_schema(database_schema: str) -> None:
    """Reject production database schemas that are not PostgreSQL identifiers."""

    # Arrange
    settings = {
        "ENV": "production",
        "DATABASE_HOST": "db",
        "DATABASE_NAME": "longlink",
        "DATABASE_PORT": 5432,
        "DATABASE_SCHEMA": database_schema,
        "DATABASE_PASSWORD": "secret",
        "DATABASE_USERNAME": "app",
        "STORAGE_BUCKET": "organization",
        "STORAGE_PREFIX": "applications/application",
        "STORAGE_REGION": "region",
        "STORAGE_PASSWORD": "secret",
        "STORAGE_USERNAME": "key",
        "STORAGE_ENDPOINT_URL": "https://storage.example.com",
    }

    # Act and assert
    with pytest.raises(ValueError, match="DATABASE_SCHEMA must be a valid PostgreSQL identifier"):
        Envs.model_validate(settings)


def test_user_table_adds_audit_soft_delete_and_user_relationships() -> None:
    """Add audit timestamps, soft-delete fields, user foreign keys, and relationships."""

    # Define an isolated mapped table with inherited audit fields.
    class FeatureAuditItem(database_base.AuditTable, table=True):
        """Temporary SDK table used to inspect inherited database fields."""

        # Table metadata
        __tablename__: ClassVar[str] = "feature_audit_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    # Inspect the inherited columns and their foreign-key targets.
    table = database_base.database_metadata.tables[FeatureAuditItem.__tablename__]
    try:
        # Verify audit fields and user relationships are available to Applications.
        assert {"created_at", "updated_at", "deleted_at"} <= set(table.c.keys())
        assert {
            column_name: {foreign_key.target_fullname for foreign_key in table.c[column_name].foreign_keys}
            for column_name in ("created_id", "updated_id", "deleted_id")
        } == {
            "created_id": {"audit.id"},
            "updated_id": {"audit.id"},
            "deleted_id": {"audit.id"},
        }
        assert all(hasattr(FeatureAuditItem, relationship) for relationship in ("created_by", "updated_by", "deleted_by"))
    finally:
        # Remove the temporary table from shared metadata.
        database_base.database_metadata.remove(table)


@pytest.mark.parametrize(
    ("database_url", "schema", "ssl", "expected"),
    [
        pytest.param("sqlite+aiosqlite:///:memory:", None, None, {}, id="sqlite"),
        pytest.param(
            "postgresql+asyncpg://app:secret@db/longlink",
            None,
            None,
            {"server_settings": {"timezone": "UTC"}},
            id="postgresql-defaults",
        ),
        pytest.param(
            "postgresql+asyncpg://app:secret@db/longlink",
            "application",
            "require",
            {"server_settings": {"timezone": "UTC", "search_path": '"application", shared'}, "ssl": "require"},
            id="postgresql-schema-and-ssl",
        ),
    ],
)
def test_connect_args_returns_driver_specific_settings(
    database_url: str, schema: str | None, ssl: str | None, expected: dict[str, object]
) -> None:
    """Return only the connection settings supported by each database driver."""

    # Act
    result = database_urls.connect_args(database_url, schema=schema, ssl=ssl)

    # Assert
    assert result == expected


@pytest.mark.parametrize(
    ("env", "expected_url", "expected_kwargs"),
    [
        pytest.param(
            Envs(ENV="testing"),
            "sqlite+aiosqlite:///:memory:",
            {"pool_pre_ping": True, "pool_recycle": 20},
            id="testing",
        ),
        pytest.param(
            Envs(ENV="development"),
            "sqlite+aiosqlite:///./dev.db",
            {"pool_pre_ping": True, "pool_recycle": 20},
            id="development",
        ),
        pytest.param(
            Envs(
                ENV="production",
                DATABASE_HOST="db",
                DATABASE_NAME="longlink",
                DATABASE_PORT=5432,
                DATABASE_SCHEMA="application",
                DATABASE_PASSWORD="secret",
                DATABASE_USERNAME="app",
                STORAGE_BUCKET="organization",
                STORAGE_PREFIX="applications/application",
                STORAGE_REGION="region",
                STORAGE_PASSWORD="secret",
                STORAGE_USERNAME="key",
                STORAGE_ENDPOINT_URL="https://storage.example.com",
            ),
            "postgresql+asyncpg://app:secret@db:5432/longlink",
            {
                "pool_pre_ping": True,
                "pool_recycle": 20,
                "pool_use_lifo": True,
                "connect_args": {"ssl": "require", "server_settings": {"timezone": "UTC", "search_path": '"application", shared'}},
            },
            id="production",
        ),
    ],
)
def test_create_engine_selects_database_url_and_options(
    monkeypatch: pytest.MonkeyPatch,
    env: Envs,
    expected_url: str,
    expected_kwargs: dict[str, object],
) -> None:
    """Use environment-specific database URLs and engine options."""

    # Capture engine settings without opening a database connection.
    captured: dict[str, object] = {}

    def fake_create_async_engine(database_url: str, **kwargs: object) -> object:
        """Capture async engine settings without opening a database connection."""

        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(database_base, "create_async_engine", fake_create_async_engine)

    # Create the environment-specific engine.
    database_base.create_engine(env)

    # Verify the selected URL and connection options.
    assert captured == {"database_url": expected_url, "kwargs": expected_kwargs}


async def test_concurrent_sessions_initialize_one_session_factory(
    monkeypatch: pytest.MonkeyPatch,
    reset_session_factory: None,
) -> None:
    """Initialize the lazy database session factory only once."""

    # Arrange
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    create_count = 0

    def counted_create_engine(_env: Envs):
        """Return the isolated engine while recording initialization attempts."""
        nonlocal create_count
        create_count += 1
        return engine

    monkeypatch.setattr(database_base, "create_engine", counted_create_engine)

    async def open_session() -> None:
        """Open and close one SDK-managed database session."""
        async with database_base.session():
            pass

    try:
        # Act
        await asyncio.gather(open_session(), open_session())

        # Assert
        assert create_count == 1
    finally:
        await engine.dispose()


async def test_session_retries_initialization_after_database_connection_failure(
    monkeypatch: pytest.MonkeyPatch,
    reset_session_factory: None,
) -> None:
    """Leave the session factory unset when its initial connection fails."""

    # Arrange
    class FailingConnection:
        """Raise the configured database error while entering the connection context."""

        async def __aenter__(self) -> None:
            """Fail before a database connection is exposed."""
            raise ConnectionError("database unavailable")

        async def __aexit__(self, *_args: object) -> None:
            """Complete the failed context-manager protocol."""

    class FailingEngine:
        """Provide a non-SQLite engine whose verification connection fails."""

        url = "postgresql+asyncpg://database"

        def connect(self) -> FailingConnection:
            """Return the failing connection context."""
            return FailingConnection()

    monkeypatch.setattr(database_base, "create_engine", lambda _env: FailingEngine())

    # Act and assert
    with pytest.raises(ConnectionError, match="database unavailable"):
        async with database_base.session():
            pass

    # Assert
    assert database_base.Session is None
