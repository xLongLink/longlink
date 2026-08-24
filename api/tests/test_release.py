import pytest
from src import release
from contextlib import asynccontextmanager

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
