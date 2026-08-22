import pytest
import asyncio
from uuid import UUID
from datetime import timedelta
from src.utils import jobs as operation_worker
from contextlib import asynccontextmanager
from longlink.utils.time import utcnow
from src.models.operations import OperationKind, OperationStatus
from src.database.models.operations import Operation

pytestmark = pytest.mark.no_db


def leased_operation() -> Operation:
    """Build one claimed compute creation Operation."""

    return Operation(
        kind=OperationKind.compute_create,
        target_id=UUID("22222222-2222-2222-2222-222222222222"),
        lease_expires_at=utcnow() + timedelta(minutes=1),
    )


async def test_execute_finishes_terminal_transition_when_cancelled(monkeypatch: pytest.MonkeyPatch) -> None:
    """Finish the claimed Operation transition before propagating cancellation."""

    # Arrange
    operation = leased_operation()
    started = asyncio.Event()
    release = asyncio.Event()

    async def complete_handler(target_id: UUID) -> str | None:
        """Complete one claimed Operation."""

        assert target_id == operation.target_id

    async def fake_complete(session, operation_id: UUID) -> Operation:
        """Delay the terminal transition until after worker cancellation."""

        assert operation_id == operation.id
        started.set()
        await release.wait()
        return operation

    monkeypatch.setattr(operation_worker.operations, "complete", fake_complete)

    # Act
    execution = asyncio.create_task(operation_worker.execute(operation, complete_handler))
    await started.wait()
    execution.cancel()
    await asyncio.sleep(0)
    execution.cancel()
    await asyncio.sleep(0)
    release.set()

    # Assert
    with pytest.raises(asyncio.CancelledError):
        await execution


async def test_execute_persists_explicit_handler_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Persist a handler failure as the one claimed Operation's terminal outcome."""

    # Arrange
    operation = leased_operation()
    transitions: list[UUID] = []

    async def failing_handler(target_id: UUID) -> str | None:
        """Return one explicit terminal failure."""

        assert target_id == operation.target_id
        return "workload deployment failed"

    async def fake_fail(session, operation_id: UUID) -> Operation:
        """Record the terminal failure transition."""

        transitions.append(operation_id)
        operation.failed = True
        operation.finished_at = utcnow()
        return operation

    monkeypatch.setattr(operation_worker.operations, "fail", fake_fail)

    # Act
    result = await operation_worker.execute(operation, failing_handler)

    # Assert
    assert result.status == OperationStatus.failed
    assert transitions == [operation.id]


async def test_scheduler_recovers_from_polling_failure_and_executes_next_operation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep polling after a claim failure and execute the next leased operation."""

    # Arrange
    operation = leased_operation()
    claims = iter((RuntimeError("database unavailable"), operation, None))
    executed: list[Operation] = []
    sleeps = 0

    class Session:
        """Provide the scheduler transaction boundary."""

        async def commit(self) -> None:
            """Commit a scheduler transaction."""

    @asynccontextmanager
    async def fake_session_scope():
        """Yield a disposable scheduler session."""

        yield Session()

    async def claim(_session: Session) -> Operation | None:
        """Raise once, then lease one operation, then report an empty queue."""

        result = next(claims)
        if isinstance(result, Exception):
            raise result
        return result

    async def execute(claimed: Operation, _handler: object) -> Operation:
        """Record the operation dispatched by the scheduler."""

        executed.append(claimed)
        return claimed

    async def sleep(_delay: float) -> None:
        """Stop after the scheduler proves it returned to idle polling."""

        nonlocal sleeps
        sleeps += 1
        if sleeps == 2:
            raise asyncio.CancelledError

    monkeypatch.setattr(operation_worker, "session_scope", fake_session_scope)
    monkeypatch.setattr(operation_worker.operations, "claim", claim)
    monkeypatch.setattr(operation_worker, "execute", execute)
    monkeypatch.setattr(operation_worker.asyncio, "sleep", sleep)

    # Act and assert
    with pytest.raises(asyncio.CancelledError):
        await operation_worker.run_operation_scheduler()

    assert executed == [operation]
