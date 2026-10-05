import ssl
import pytest
import asyncio
from typing import ClassVar
from sqlmodel import Field, SQLModel
from sqlalchemy import text
from longlink.database import base as database_base
from longlink.database import urls as database_urls
from sqlalchemy.engine import URL, make_url
from longlink.utils.settings import Envs

PRODUCTION_SETTINGS = {
    "ENV": "production",
    "IDENTITY_SECRET": "identity-secret",
    "DATABASE_HOST": "db",
    "DATABASE_NAME": "longlink",
    "DATABASE_PORT": 5432,
    "DATABASE_SCHEMA": "solution",
    "DATABASE_CERTIFICATE": "database-ca-pem",
    "DATABASE_PASSWORD": "secret",
    "DATABASE_USERNAME": "solution",
    "STORAGE_BUCKET": "organization",
    "STORAGE_PREFIX": "solutions/solution",
    "STORAGE_REGION": "region",
    "STORAGE_PASSWORD": "secret",
    "STORAGE_USERNAME": "key",
    "STORAGE_ENDPOINT_URL": "https://storage.example.com",
}


class VerificationEngine:
    """Provide a failing non-SQLite database verification boundary."""

    url = make_url("postgresql+asyncpg://database")

    def __init__(self, failure: Exception) -> None:
        """Configure the connection outcome and cleanup observation."""

        self.failure = failure
        self.disposed = False

    def connect(self) -> "VerificationEngine":
        """Return the verification connection context."""

        return self

    async def __aenter__(self) -> None:
        """Raise the configured connection failure."""

        raise self.failure

    async def __aexit__(self, *_args: object) -> None:
        """Complete the verification connection context."""

    async def dispose(self) -> None:
        """Record release of the engine resources."""

        self.disposed = True


class SchemaEngine:
    """Provide a failing SQLite schema initialization boundary."""

    url = make_url("sqlite+aiosqlite:///:memory:")

    def __init__(self, failure: Exception) -> None:
        """Configure the schema failure and cleanup observation."""

        self.failure = failure
        self.disposed = False

    def begin(self) -> "SchemaEngine":
        """Return the schema transaction context."""

        return self

    async def __aenter__(self) -> "SchemaEngine":
        """Yield the fake schema connection."""

        return self

    async def __aexit__(self, *_args: object) -> None:
        """Complete the fake schema transaction."""

    async def run_sync(self, _operation: object) -> None:
        """Raise the configured schema initialization failure."""

        raise self.failure

    async def dispose(self) -> None:
        """Record release of the engine resources."""

        self.disposed = True


@pytest.mark.parametrize("database_schema", ["solution-schema", "public; DROP SCHEMA shared", '"solution"'])
def test_production_settings_reject_invalid_database_schema(database_schema: str) -> None:
    """Reject production database schemas that are not PostgreSQL identifiers."""

    # Arrange
    settings = PRODUCTION_SETTINGS | {"DATABASE_SCHEMA": database_schema}

    # Act and assert
    with pytest.raises(ValueError, match="DATABASE_SCHEMA must be a valid PostgreSQL identifier"):
        Envs.model_validate(settings)


def test_user_table_adds_audit_soft_delete_and_user_relationships() -> None:
    """Add audit timestamps, soft-delete fields, user foreign keys, and relationships."""

    # Define an isolated mapped table with inherited audit fields.
    class FeatureAuditItem(database_base.Audit, table=True):
        """Temporary SDK table used to inspect inherited database fields."""

        # Table metadata
        __tablename__: ClassVar[str] = "feature_audit_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    # Inspect the inherited columns and their foreign-key targets.
    table = SQLModel.metadata.tables[FeatureAuditItem.__tablename__]
    try:
        # Verify audit fields and user relationships are available to Solutions.
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
        SQLModel.metadata.remove(table)


@pytest.mark.parametrize(
    ("database_url", "schema", "expected"),
    [
        pytest.param("sqlite+aiosqlite:///:memory:", None, {}, id="sqlite"),
        pytest.param(
            "postgresql+asyncpg://solution:secret@db/longlink",
            None,
            {"server_settings": {"timezone": "UTC"}},
            id="postgresql-defaults",
        ),
        pytest.param(
            "postgresql+asyncpg://solution:secret@db/longlink",
            "solution",
            {"server_settings": {"timezone": "UTC", "search_path": '"solution", shared'}},
            id="postgresql-schema",
        ),
    ],
)
def test_connect_args_returns_driver_specific_settings(database_url: str, schema: str | None, expected: dict[str, object]) -> None:
    """Return only the connection settings supported by each database driver."""

    # Act
    result = database_urls.connect_args(database_url, schema=schema)

    # Assert
    assert result == expected


@pytest.mark.parametrize(
    ("env", "expected_url", "expected_kwargs"),
    [
        pytest.param(
            Envs(ENV="testing"),
            make_url("sqlite+aiosqlite:///:memory:"),
            {"hide_parameters": True},
            id="testing",
        ),
        pytest.param(
            Envs(ENV="development"),
            make_url("sqlite+aiosqlite:///./dev.db"),
            {"hide_parameters": True},
            id="development",
        ),
        pytest.param(
            Envs.model_validate(PRODUCTION_SETTINGS),
            URL.create(
                "postgresql+asyncpg",
                username="solution",
                password="secret",
                host="db",
                port=5432,
                database="longlink",
            ),
            {
                "hide_parameters": True,
                "pool_pre_ping": True,
                "pool_recycle": 20,
                "pool_use_lifo": True,
                "connect_args": {"server_settings": {"timezone": "UTC", "search_path": '"solution", shared'}},
            },
            id="production",
        ),
    ],
)
def test_create_engine_selects_database_url_and_options(
    monkeypatch: pytest.MonkeyPatch,
    ca_certificate: str,
    env: Envs,
    expected_url: URL,
    expected_kwargs: dict[str, object],
) -> None:
    """Use environment-specific database URLs and engine options."""

    # Supply the real CA without changing the shared production settings.
    if env.ENV == "production":
        env = env.model_copy(update={"DATABASE_CERTIFICATE": ca_certificate})

    # Capture engine settings without opening a database connection.
    captured: dict[str, object] = {}

    def fake_create_async_engine(database_url: URL, **kwargs: object) -> object:
        """Capture async engine settings without opening a database connection."""

        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(database_base, "create_async_engine", fake_create_async_engine)

    # Create the environment-specific engine.
    database_base.create_engine(env)

    # Verify the production TLS policy and CA separately from the remaining engine options.
    if env.ENV == "production":
        engine_kwargs = captured["kwargs"]
        assert isinstance(engine_kwargs, dict)
        connect_args = engine_kwargs["connect_args"]
        assert isinstance(connect_args, dict)
        certificate_context = connect_args.pop("ssl")
        assert isinstance(certificate_context, ssl.SSLContext)
        assert certificate_context.verify_mode == ssl.CERT_REQUIRED
        assert certificate_context.check_hostname is True
        assert ssl.PEM_cert_to_DER_cert(ca_certificate) in certificate_context.get_ca_certs(binary_form=True)

    # Verify the selected URL and connection options.
    assert captured == {"database_url": expected_url, "kwargs": expected_kwargs}


async def test_concurrent_sessions_initialize_one_engine(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Initialize the lazy database engine only once."""

    # Arrange
    create_count = 0
    create_engine = database_base.create_engine

    def counted_create_engine(env: Envs):
        """Create an isolated engine while recording initialization attempts."""
        nonlocal create_count
        create_count += 1
        return create_engine(env)

    monkeypatch.setattr(database_base, "create_engine", counted_create_engine)
    database = database_base.Database(Envs(ENV="testing"))

    async def open_session() -> None:
        """Open and close one SDK-managed database session."""
        async with database.session():
            pass

    try:
        # Act
        await asyncio.gather(open_session(), open_session())

        # Assert
        assert create_count == 1

        # Dispose the cached resources, then verify a later session recreates them.
        await database.dispose()
        await open_session()
        assert create_count == 2
    finally:
        await database.dispose()


async def test_session_retries_initialization_after_database_connection_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Retry session initialization after its initial connection fails."""

    # Arrange
    engine = VerificationEngine(ConnectionError("database unavailable"))
    database = database_base.Database(Envs.model_validate(PRODUCTION_SETTINGS))
    create_engine = database_base.create_engine

    # Act and assert
    with monkeypatch.context() as failing_engine:
        failing_engine.setattr(database_base, "create_engine", lambda _env: engine)
        with pytest.raises(ConnectionError, match="database unavailable"):
            async with database.session():
                pass

    # Assert
    assert engine.disposed

    # Retry the production connection path against a real isolated SQLite engine.
    try:
        with monkeypatch.context() as retry_engine:
            retry_engine.setattr(database_base, "create_engine", lambda _env: create_engine(Envs(ENV="testing")))
            async with database.session() as database_session:
                assert await database_session.scalar(text("SELECT 1")) == 1
    finally:
        await database.dispose()


async def test_session_disposes_sqlite_engine_after_schema_initialization_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Release SQLite resources when automatic schema creation fails."""

    # Arrange
    engine = SchemaEngine(RuntimeError("schema unavailable"))
    monkeypatch.setattr(database_base, "create_engine", lambda _env: engine)
    database = database_base.Database(Envs(ENV="testing"))

    # Act and assert
    with pytest.raises(RuntimeError, match="schema unavailable"):
        async with database.session():
            pass
    assert engine.disposed
