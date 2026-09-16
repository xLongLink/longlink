import main
import runpy
import pytest
from pathlib import Path
from contextlib import asynccontextmanager
from src.database import session as database_session
from collections.abc import Callable, Awaitable
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db


def test_static_web_bundle_serves_root() -> None:
    """Serve the built API web bundle at the root path."""

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_main_skips_static_routes_when_web_bundle_is_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Construct the API without frontend routes when the bundle is unavailable."""

    # Arrange
    monkeypatch.setattr(Path, "exists", lambda _path: False)

    # Act
    module = runpy.run_path(main.__file__, run_name="main_without_static_bundle")

    # Assert
    app = module["app"]
    assert all(getattr(route, "path", None) != "/" for route in app.routes)


async def test_lifespan_reconciles_administrator_and_stops_background_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reconcile the administrator before starting and cancelling background jobs."""

    # Arrange
    events: list[str] = []

    class Session:
        """Record lifecycle database work."""

        async def commit(self) -> None:
            """Record the administrator transaction commit."""

            events.append("commit")

    @asynccontextmanager
    async def session_scope():
        """Yield the session used for administrator reconciliation."""

        yield Session()

    async def ensure_administrator(_session: Session) -> None:
        """Record administrator reconciliation."""

        events.append("administrator")

    def run_scheduler(name: str) -> Callable[[], Awaitable[None]]:
        """Return one scheduler that records its startup and lifespan-shutdown cancellation."""

        async def scheduler() -> None:
            """Record scheduler startup and cancellation from lifespan shutdown."""

            events.append(f"{name} start")
            try:
                await main.asyncio.Event().wait()
            except main.asyncio.CancelledError:
                events.append(f"{name} cancel")
                raise

        return scheduler

    monkeypatch.setattr(main, "session_scope", session_scope)
    monkeypatch.setattr(main.user_service, "ensure_administrator", ensure_administrator)
    monkeypatch.setattr(main.jobs, "run_operation_scheduler", run_scheduler("scheduler"))
    monkeypatch.setattr(main.jobs, "run_database_scheduler", run_scheduler("database"))

    # Act
    async with main.lifespan(main.app):
        await main.asyncio.sleep(0)
        events.append("serving")

    # Assert
    assert events == [
        "administrator",
        "commit",
        "scheduler start",
        "database start",
        "serving",
        "scheduler cancel",
        "database cancel",
    ]


@pytest.mark.parametrize(
    ("database_url", "expected_kwargs"),
    [
        pytest.param(
            "mysql+aiomysql://control:secret@db:3306/longlink",
            {"isolation_level": "READ COMMITTED", "pool_use_lifo": True},
            id="mysql",
        ),
        pytest.param("sqlite+aiosqlite:///./test.db", {}, id="sqlite"),
    ],
)
async def test_get_session_configures_database_specific_engine_options(
    monkeypatch: pytest.MonkeyPatch, database_url: str, expected_kwargs: dict[str, object]
) -> None:
    """Apply transaction and pooling options only to the relevant database drivers."""

    # Arrange
    captured: dict[str, object] = {}
    session_factory = object()

    def create_async_engine(url: object, **kwargs: object) -> object:
        """Capture engine construction without opening a database connection."""

        captured["url"] = url
        captured["kwargs"] = kwargs
        return object()

    def async_sessionmaker(_engine: object, **_kwargs: object) -> object:
        """Return an opaque session factory after engine configuration."""

        return session_factory

    monkeypatch.setattr(database_session.env, "DATABASE_URL", database_url)
    monkeypatch.setattr(database_session, "Session", None)
    monkeypatch.setattr(database_session, "create_async_engine", create_async_engine)
    monkeypatch.setattr(database_session, "async_sessionmaker", async_sessionmaker)
    monkeypatch.setattr(database_session, "enable_sqlite_foreign_keys", lambda _engine: None)

    # Act
    result = database_session.get_session()

    # Assert
    assert result is session_factory
    kwargs = captured["kwargs"]
    assert isinstance(kwargs, dict)
    assert {key: value for key, value in kwargs.items() if key in ("isolation_level", "pool_use_lifo")} == expected_kwargs
