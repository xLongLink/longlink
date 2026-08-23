import main
import pytest
from contextlib import asynccontextmanager
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db


def test_static_web_bundle_serves_root() -> None:
    """Serve the built API web bundle at the root path."""

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


async def test_lifespan_reconciles_administrator_and_stops_scheduler(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reconcile the administrator before starting and cancelling the scheduler."""

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

    async def scheduler() -> None:
        """Record scheduler startup and cancellation from lifespan shutdown."""

        events.append("start")
        try:
            await main.asyncio.Event().wait()
        except main.asyncio.CancelledError:
            events.append("cancel")
            raise

    monkeypatch.setattr(main, "session_scope", session_scope)
    monkeypatch.setattr(main.user_service, "ensure_administrator", ensure_administrator)
    monkeypatch.setattr(main.jobs, "run_operation_scheduler", scheduler)

    # Act
    async with main.lifespan(main.app):
        await main.asyncio.sleep(0)
        events.append("serving")

    # Assert
    assert events == ["administrator", "commit", "start", "serving", "cancel"]
