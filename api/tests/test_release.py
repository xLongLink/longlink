import runpy
import pytest
from src import release
from contextlib import asynccontextmanager
from collections.abc import Coroutine

pytestmark = pytest.mark.no_db


async def test_schedule_reconciliation_commits_scheduled_work(monkeypatch: pytest.MonkeyPatch) -> None:
    """Commit the transaction after scheduling reconciliation targets."""

    # Arrange
    events: list[str] = []

    class Session:
        """Record the scheduling transaction commit."""

        async def commit(self) -> None:
            """Record the commit after scheduling."""

            events.append("commit")

    @asynccontextmanager
    async def session_scope():
        """Yield the reconciliation session."""

        yield Session()

    async def schedule_reconciliation(_session: Session) -> None:
        """Record the reconciliation scheduling request."""

        events.append("schedule")

    monkeypatch.setattr(release, "session_scope", session_scope)
    monkeypatch.setattr(release.operations, "schedule_reconciliation", schedule_reconciliation)

    # Act
    await release.schedule_reconciliation()

    # Assert
    assert events == ["schedule", "commit"]


async def test_schedule_reconciliation_does_not_commit_after_scheduling_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Propagate scheduling failures without committing a partial transaction."""

    # Arrange
    events: list[str] = []

    class Session:
        """Record whether the failed transaction is committed."""

        async def commit(self) -> None:
            """Record an unexpected partial commit."""

            events.append("commit")

    @asynccontextmanager
    async def session_scope():
        """Yield the reconciliation session."""

        yield Session()

    async def schedule_reconciliation(_session: Session) -> None:
        """Simulate a scheduling failure."""

        raise RuntimeError("database unavailable")

    monkeypatch.setattr(release, "session_scope", session_scope)
    monkeypatch.setattr(release.operations, "schedule_reconciliation", schedule_reconciliation)

    # Act and assert
    with pytest.raises(RuntimeError, match="database unavailable"):
        await release.schedule_reconciliation()

    assert events == []


def test_release_module_runs_reconciliation_when_executed_as_a_script(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run the reconciliation coroutine through the module script entry point."""

    # Arrange
    scheduled: list[object] = []

    def run(coroutine: Coroutine[object, object, object]) -> None:
        """Capture and close the entry-point coroutine without database work."""

        scheduled.append(coroutine)
        coroutine.close()

    monkeypatch.setattr(release.asyncio, "run", run)

    # Act
    runpy.run_path(release.__file__, run_name="__main__")

    # Assert
    assert len(scheduled) == 1
