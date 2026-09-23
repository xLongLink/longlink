import main
import runpy
import pytest
from pathlib import Path
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


async def test_lifespan_starts_and_stops_background_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Start administrator reconciliation and scheduler work without delaying serving."""

    # Arrange
    events: list[str] = []

    async def dispose_engine() -> None:
        """Record shared database engine disposal."""

        events.append("dispose")

    def run_background_task(name: str) -> Callable[[], Awaitable[None]]:
        """Return one task that records its startup and lifespan-shutdown cancellation."""

        async def background_task() -> None:
            """Record background task startup and cancellation from lifespan shutdown."""

            events.append(f"{name} start")
            try:
                await main.asyncio.Event().wait()
            except main.asyncio.CancelledError:
                events.append(f"{name} cancel")
                raise

        return background_task

    monkeypatch.setattr(main.jobs, "run_administrator_reconciler", run_background_task("administrator"))
    monkeypatch.setattr(main.jobs, "run_operation_scheduler", run_background_task("scheduler"))
    monkeypatch.setattr(main, "dispose_engine", dispose_engine)

    # Act
    async with main.lifespan(main.app):
        await main.asyncio.sleep(0)
        events.append("serving")

    # Assert
    assert events == [
        "administrator start",
        "scheduler start",
        "serving",
        "administrator cancel",
        "scheduler cancel",
        "dispose",
    ]


def test_get_session_applies_mysql_engine_options(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply transaction and pooling options to the MySQL database driver."""

    # Arrange
    captured: dict[str, dict[str, object]] = {}
    session_factory = object()

    def create_async_engine(url: object, **kwargs: object) -> object:
        """Capture engine construction without opening a database connection."""

        captured["kwargs"] = kwargs
        return object()

    def async_sessionmaker(_engine: object, **_kwargs: object) -> object:
        """Return an opaque session factory after engine configuration."""

        return session_factory

    monkeypatch.setattr(database_session.env, "DATABASE_URL", "mysql+aiomysql://control:secret@db:3306/longlink")
    monkeypatch.setattr(database_session, "Session", None)
    monkeypatch.setattr(database_session, "create_async_engine", create_async_engine)
    monkeypatch.setattr(database_session, "async_sessionmaker", async_sessionmaker)
    monkeypatch.setattr(database_session, "enable_sqlite_foreign_keys", lambda _engine: None)

    # Act
    result = database_session.get_session()

    # Assert
    assert result is session_factory
    kwargs = captured["kwargs"]
    assert kwargs["hide_parameters"] is True
    assert kwargs["isolation_level"] == "READ COMMITTED"
    assert kwargs["pool_use_lifo"] is True
