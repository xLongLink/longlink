import ssl
import pytest
import asyncio
import sqlite3
from typing import Literal
from pathlib import Path
from sqlmodel import SQLModel
from sqlalchemy import text, event
from sqlalchemy.exc import OperationalError
from longlink.database import base as database_base
from longlink.database import urls as database_urls
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from longlink.utils.settings import Envs


@pytest.mark.parametrize("database_schema", ["solution-schema", "public; DROP SCHEMA shared", '"solution"'])
def test_production_settings_reject_invalid_database_schema(database_schema: str, production_settings: dict[str, str | int]) -> None:
    """Reject production database schemas that are not PostgreSQL identifiers."""

    # Arrange
    settings = production_settings | {"DATABASE_SCHEMA": database_schema}

    # Act and assert
    with pytest.raises(ValueError, match="DATABASE_SCHEMA must be a valid PostgreSQL identifier"):
        Envs.model_validate(settings)


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
    ("environment", "expected_url", "expected_kwargs"),
    [
        pytest.param(
            "testing",
            make_url("sqlite+aiosqlite:///:memory:"),
            {"hide_parameters": True},
            id="testing",
        ),
        pytest.param(
            "development",
            make_url("sqlite+aiosqlite:///./dev.db"),
            {"hide_parameters": True},
            id="development",
        ),
        pytest.param(
            "production",
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
async def test_create_engine_selects_database_url_and_options(
    monkeypatch: pytest.MonkeyPatch,
    ca_certificate: str,
    environment: Literal["testing", "development", "production"],
    production_settings: dict[str, str | int],
    expected_url: URL,
    expected_kwargs: dict[str, object],
) -> None:
    """Use environment-specific database URLs and engine options."""

    # Arrange environment-specific inputs with a real production CA.
    settings = production_settings | {"DATABASE_CERTIFICATE": ca_certificate} if environment == "production" else {"ENV": environment}
    env = Envs.model_validate(settings)

    # Record settings while constructing a real engine without connecting.
    captured: dict[str, object] = {}

    def record_create_async_engine(database_url: URL, **kwargs: object) -> AsyncEngine:
        """Record async engine settings and forward them to SQLAlchemy."""

        # Preserve the exact arguments accepted by the real engine factory.
        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return create_async_engine(database_url, **kwargs)

    monkeypatch.setattr(database_base, "create_async_engine", record_create_async_engine)

    # Act
    engine = database_base.create_engine(env)

    try:
        # Assert the real engine uses the selected URL and preserve its forwarded options.
        assert engine.url == expected_url
        engine_kwargs = captured["kwargs"]
        assert isinstance(engine_kwargs, dict)
        engine_kwargs = engine_kwargs.copy()

        # Verify TLS separately, normalizing only a copy of the connection arguments.
        if env.ENV == "production":
            connect_args = engine_kwargs["connect_args"]
            assert isinstance(connect_args, dict)
            connect_args = connect_args.copy()
            engine_kwargs["connect_args"] = connect_args
            certificate_context = connect_args.pop("ssl")
            assert isinstance(certificate_context, ssl.SSLContext)
            assert certificate_context.verify_mode == ssl.CERT_REQUIRED
            assert certificate_context.check_hostname is True
            assert ssl.PEM_cert_to_DER_cert(ca_certificate) in certificate_context.get_ca_certs(binary_form=True)

        # Verify the exact selected URL and remaining connection options.
        assert captured["database_url"] == expected_url
        assert engine_kwargs == expected_kwargs
    finally:
        # Release the real engine even when an assertion fails.
        await engine.dispose()


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
    tmp_path: Path,
    production_settings: dict[str, str | int],
) -> None:
    """Retry session initialization after its initial connection fails."""

    # Arrange
    engine = create_async_engine(URL.create("sqlite+aiosqlite", database=str(tmp_path)))
    original_pool = engine.pool
    database = database_base.Database(Envs.model_validate(production_settings))
    create_engine = database_base.create_engine

    try:
        # Act and assert
        with monkeypatch.context() as failing_engine:
            failing_engine.setattr(database_base, "create_engine", lambda _env: engine)
            with pytest.raises(OperationalError, match="unable to open database file") as error:
                async with database.session():
                    pass

        # Assert the real connection error survives cleanup and disposal replaces the pool.
        assert isinstance(error.value.orig, sqlite3.OperationalError)
        assert error.value.orig.args == ("unable to open database file",)
        assert engine.pool is not original_pool

        # Retry the production connection path against a real isolated SQLite engine.
        with monkeypatch.context() as retry_engine:
            retry_engine.setattr(database_base, "create_engine", lambda _env: create_engine(Envs(ENV="testing")))
            async with database.session() as database_session:
                assert await database_session.scalar(text("SELECT 1")) == 1
    finally:
        # Release both engines even if the disposal regression assertions fail.
        await engine.dispose()
        await database.dispose()


async def test_session_disposes_sqlite_engine_after_schema_initialization_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Release SQLite resources when automatic schema creation fails."""

    # Arrange
    engine = database_base.create_engine(Envs(ENV="testing"))
    original_pool = engine.pool
    closed_connections: list[object] = []
    failure = RuntimeError("schema unavailable")

    def fail_schema_creation(_connection: object) -> None:
        """Fail only schema creation inside the real SQLite transaction."""

        # Preserve the exact initialization error for the caller.
        raise failure

    def record_connection_close(connection: object, _record: object) -> None:
        """Observe SQLite connection release through SQLAlchemy's pool event."""

        # Record real pool cleanup without replacing disposal.
        closed_connections.append(connection)

    event.listen(engine.sync_engine, "close", record_connection_close)
    monkeypatch.setattr(SQLModel.metadata, "create_all", fail_schema_creation)
    monkeypatch.setattr(database_base, "create_engine", lambda _env: engine)
    database = database_base.Database(Envs(ENV="testing"))

    try:
        # Act and assert
        with pytest.raises(RuntimeError, match="schema unavailable") as error:
            async with database.session():
                pass
        assert error.value is failure
        assert len(closed_connections) == 1
        assert engine.pool is not original_pool
    finally:
        # Release resources even if the disposal regression assertions fail.
        await engine.dispose()
