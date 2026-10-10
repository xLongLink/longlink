import main
import runpy
import pytest
from pathlib import Path
from src.database import session as database_session
from collections.abc import Callable, Awaitable
from sqlalchemy.engine import URL
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine

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

    async def dispose_clients() -> None:
        """Record shared Kubernetes transport disposal."""

        events.append("kubernetes dispose")

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
    monkeypatch.setattr(main.client, "dispose_clients", dispose_clients)
    monkeypatch.setattr(main, "dispose_engine", dispose_engine)

    # Act
    async with main.lifespan(main.app):
        await main.asyncio.sleep(0)
        events.append("serving")

    # Assert both jobs stop before the shared Kubernetes transport and database pool are disposed.
    assert len(events) == 7
    assert set(events[:2]) == {"administrator start", "scheduler start"}
    assert events[2] == "serving"
    assert set(events[3:5]) == {"administrator cancel", "scheduler cancel"}
    assert events[5:] == ["kubernetes dispose", "dispose"]


async def test_get_session_applies_mysql_engine_options(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply transaction and pooling options to the MySQL database driver."""

    # Arrange
    captured: dict[str, dict[str, object]] = {}
    real_create_async_engine = database_session.create_async_engine

    def create_async_engine(url: str | URL, **kwargs: object) -> AsyncEngine:
        """Capture engine construction without opening a database connection."""

        captured["kwargs"] = kwargs
        return real_create_async_engine(url, **kwargs)

    monkeypatch.setattr(database_session.env, "DATABASE_URL", "mysql+aiomysql://control:secret@db:3306/longlink")
    monkeypatch.setattr(database_session, "Session", None)
    monkeypatch.setattr(database_session, "create_async_engine", create_async_engine)

    # Act
    result = database_session.get_session()

    # Assert the real session factory binds the configured engine, then release it.
    engine = result.kw["bind"]
    assert isinstance(engine, AsyncEngine)
    try:
        kwargs = captured["kwargs"]
        assert kwargs["hide_parameters"] is True
        assert kwargs["isolation_level"] == "READ COMMITTED"
        assert kwargs["pool_use_lifo"] is True
    finally:
        await database_session.dispose_engine()
    assert database_session.Session is None
