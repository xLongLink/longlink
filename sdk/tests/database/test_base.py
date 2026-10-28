import ssl
import pytest
import asyncio
import sqlite3
from typing import Literal
from pathlib import Path
from sqlmodel import SQLModel, select
from sqlalchemy import text, event, literal
from sqlalchemy.exc import OperationalError
from longlink.database import base as database_base
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncConnection, create_async_engine
from longlink.utils.settings import Envs


@pytest.mark.parametrize(
    ("environment", "expected_url", "expected_kwargs"),
    [
        pytest.param("testing", make_url("sqlite+aiosqlite:///:memory:"), {"hide_parameters": True}, id="testing"),
        pytest.param("development", make_url("sqlite+aiosqlite:///./dev.db"), {"hide_parameters": True}, id="development"),
        pytest.param(
            "production",
            URL.create("postgresql+asyncpg", username="solution", password="secret", host="db", port=5432, database="longlink"),
            {
                "hide_parameters": True,
                "pool_size": 1,
                "pool_pre_ping": True,
                "pool_recycle": 20,
                "pool_use_lifo": True,
                "connect_args": {"server_settings": {"timezone": "UTC", "search_path": '"solution"'}},
            },
            # Production connections receive schema and TLS configuration.
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
    captured: list[dict[str, object]] = []

    def record_create_async_engine(database_url: URL, **kwargs: object) -> AsyncEngine:
        """Record async engine settings and forward them to SQLAlchemy."""

        # Preserve the exact arguments accepted by the real engine factory.
        captured.append(kwargs)
        return create_async_engine(database_url, **kwargs)

    monkeypatch.setattr(database_base, "create_async_engine", record_create_async_engine)

    # Act
    engine = database_base.create_engine(env)

    try:

        # Assert the real engine uses the selected URL and preserve its forwarded options.
        assert engine.url == expected_url
        [engine_kwargs] = captured
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

            # Custom trust must not disable hostname verification.
            assert certificate_context.check_hostname is True
            assert ssl.PEM_cert_to_DER_cert(ca_certificate) in certificate_context.get_ca_certs(binary_form=True)

        # Verify the remaining connection options.
        assert engine_kwargs == expected_kwargs
    finally:

        # Release the real engine even when an assertion fails.
        await engine.dispose()


async def test_concurrent_sessions_share_a_usable_engine_until_disposal() -> None:
    """Share one usable engine and initialize a fresh one after disposal."""

    # Arrange
    database = database_base.Database(Envs(ENV="testing"))

    async def open_session() -> AsyncEngine | AsyncConnection | None:
        """Query through an SDK-managed session and return its public bind."""

        async with database.session() as session:
            result = await session.exec(select(literal(1)))
            assert result.one() == 1
            return session.bind

    try:

        # Act
        first_engine, second_engine = await asyncio.gather(open_session(), open_session())

        # Assert
        assert first_engine is not None
        assert second_engine is first_engine

        # Dispose the cached resources, then verify a later session recreates them.
        await database.dispose()
        fresh_engine = await open_session()
        assert fresh_engine is not None
        assert fresh_engine is not first_engine
    finally:
        await database.dispose()


async def test_session_retries_initialization_after_database_connection_failure(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, production_settings: dict[str, str | int]
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

                # Failed initialization must not publish a usable session.
                async with database.session():
                    pass

        # Assert the real connection error survives cleanup and disposal replaces the pool.
        assert isinstance(error.value.orig, sqlite3.OperationalError)
        assert error.value.orig.args == ("unable to open database file",)

        # Disposal replaces the old connection pool instead of retaining stale handles.
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


async def test_session_disposes_sqlite_engine_after_schema_initialization_failure(monkeypatch: pytest.MonkeyPatch) -> None:
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

        # Failed initialization closes its connections and replaces the old pool.
        assert len(closed_connections) == 1
        assert engine.pool is not original_pool
    finally:

        # Release resources even if the disposal regression assertions fail.
        await engine.dispose()


async def test_session_disposes_sqlite_engine_after_initialization_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    """Clean up cancelled schema initialization and allow the same database to retry."""

    # Arrange
    engine = database_base.create_engine(Envs(ENV="testing"))
    original_pool = engine.pool
    closed_connections: list[object] = []
    schema_started = asyncio.Event()
    schema_release = asyncio.Event()
    schema_connection: AsyncConnection | None = None
    body_entered = False
    initialization_timeout = asyncio.timeout(None)
    database = database_base.Database(Envs(ENV="testing"))

    def record_connection_close(connection: object, _record: object) -> None:
        """Observe real SQLite connection closure without replacing cleanup."""

        # Record disposal through SQLAlchemy's real pool event.
        closed_connections.append(connection)

    async def suspend_schema_creation(connection: AsyncConnection, create_all: object) -> None:
        """Suspend only schema creation after the real connection has opened."""

        # Keep the transaction and all cancellation cleanup real.
        nonlocal schema_connection
        assert create_all == SQLModel.metadata.create_all
        schema_connection = connection
        schema_started.set()
        await schema_release.wait()

    async def open_session() -> None:
        """Apply a real timeout to database initialization before yielding a session."""

        # Leave the deadline unarmed until initialization reaches the suspension.
        nonlocal body_entered
        async with initialization_timeout:
            async with database.session():
                body_entered = True

    event.listen(engine.sync_engine, "close", record_connection_close)

    try:

        # Act with a scoped suspension seam and a bounded diagnostic watchdog.
        with monkeypatch.context() as suspended_initialization:
            suspended_initialization.setattr(database_base, "create_engine", lambda _env: engine)
            suspended_initialization.setattr(AsyncConnection, "run_sync", suspend_schema_creation)
            task = asyncio.create_task(open_session())
            try:

                # Cancel only after schema creation has actually started.
                async with asyncio.timeout(5):
                    await schema_started.wait()
                    initialization_timeout.reschedule(asyncio.get_running_loop().time())

                    # Await the real cancelled initialization task and preserve its timeout error.
                    with pytest.raises(TimeoutError) as error:
                        await task

                # Assert cleanup happened before any test finalizer could dispose the engine.
                assert initialization_timeout.expired()
                assert isinstance(error.value.__cause__, asyncio.CancelledError)
                assert not body_entered
                assert schema_connection is not None
                assert schema_connection.closed
                assert len(closed_connections) == 1
                assert engine.pool is not original_pool
            finally:

                # Reap the initialization task even if a diagnostic assertion fails.
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)

        # Restore schema creation and prove the same Database can initialize and query.
        async with database.session() as database_session:
            assert await database_session.scalar(text("SELECT 1")) == 1
    finally:

        # Release failed and recovered engines even when the test fails.
        await engine.dispose()
        await database.dispose()
