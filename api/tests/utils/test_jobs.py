import pytest
import asyncio
from uuid import UUID
from datetime import timedelta
from src.utils import jobs as operation_worker
from contextlib import asynccontextmanager
from collections.abc import Callable, Awaitable
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


def failed_transition(operation: Operation) -> Callable[[object, UUID], Awaitable[Operation]]:
    """Build a failure transition for one claimed Operation."""

    async def fail(_session: object, operation_id: UUID) -> Operation:
        """Mark the expected Operation as failed."""

        assert operation_id == operation.id
        operation.failed = True
        operation.finished_at = utcnow()
        return operation

    return fail


async def test_execute_finishes_terminal_transition_when_cancelled(monkeypatch: pytest.MonkeyPatch) -> None:
    """Finish the claimed Operation transition before propagating cancellation."""

    # Arrange
    operation = leased_operation()
    started = asyncio.Event()
    release = asyncio.Event()
    completed_operation_ids: list[UUID] = []

    async def complete_handler(target_id: UUID) -> str | None:
        """Complete one claimed Operation."""

        assert target_id == operation.target_id

    monkeypatch.setitem(operation_worker.handlers, operation.kind, complete_handler)

    async def fake_complete(session, operation_id: UUID) -> Operation:
        """Delay the terminal transition until after worker cancellation."""

        assert operation_id == operation.id
        started.set()
        await release.wait()
        completed_operation_ids.append(operation_id)
        return operation

    monkeypatch.setattr(operation_worker.operations, "complete", fake_complete)

    # Act
    execution = asyncio.create_task(operation_worker.execute(operation))
    await started.wait()
    execution.cancel()
    await asyncio.sleep(0)
    execution.cancel()
    await asyncio.sleep(0)
    release.set()

    # Assert
    with pytest.raises(asyncio.CancelledError):
        await execution
    assert completed_operation_ids == [operation.id]


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
    monkeypatch.setitem(operation_worker.handlers, operation.kind, failing_handler)

    result = await operation_worker.execute(operation)

    # Assert
    assert result.status == OperationStatus.failed
    assert transitions == [operation.id]


async def test_execute_persists_timeout_as_terminal_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Persist a timed-out handler as a failed claimed Operation."""

    # Arrange
    operation = leased_operation()

    @asynccontextmanager
    async def expired_timeout(_seconds: int):
        """Raise the worker timeout after one handler execution."""

        yield
        raise TimeoutError

    async def complete_handler(_target_id: UUID) -> None:
        """Complete before the configured worker timeout expires."""

    monkeypatch.setattr(operation_worker.asyncio, "timeout", expired_timeout)
    monkeypatch.setitem(operation_worker.handlers, operation.kind, complete_handler)
    monkeypatch.setattr(operation_worker.operations, "fail", failed_transition(operation))

    # Act
    result = await operation_worker.execute(operation)

    # Assert
    assert result.status == OperationStatus.failed


async def test_execute_persists_unexpected_handler_error_as_terminal_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Contain an unexpected handler exception and release its Operation lease."""

    # Arrange
    operation = leased_operation()

    async def failing_handler(_target_id: UUID) -> None:
        """Raise an unexpected worker failure."""

        raise RuntimeError("provider unavailable")

    monkeypatch.setitem(operation_worker.handlers, operation.kind, failing_handler)
    monkeypatch.setattr(operation_worker.operations, "fail", failed_transition(operation))

    # Act
    result = await operation_worker.execute(operation)

    # Assert
    assert result.status == OperationStatus.failed


async def test_execute_rejects_operation_without_a_worker_lease() -> None:
    """Reject an Operation before it reaches its handler without a live lease."""

    # Arrange
    operation = Operation(
        kind=OperationKind.compute_create,
        target_id=UUID("22222222-2222-2222-2222-222222222222"),
    )

    # Act and assert
    with pytest.raises(ValueError, match="Operation must be claimed before execution"):
        await operation_worker.execute(operation)


async def test_execute_rejects_lost_terminal_operation_lock(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a terminal outcome that could not release the claimed operation lock."""

    # Arrange
    operation = leased_operation()

    async def complete_handler(_target_id: UUID) -> None:
        """Complete the operation handler successfully."""

    async def finish_transition(_transition: object, _operation_id: UUID) -> None:
        """Simulate a concurrent worker releasing the operation lock."""

    monkeypatch.setitem(operation_worker.handlers, operation.kind, complete_handler)
    monkeypatch.setattr(operation_worker, "_finish_transition", finish_transition)

    # Act and assert
    with pytest.raises(RuntimeError, match=f"Operation '{operation.id}' lock was lost"):
        await operation_worker.execute(operation)


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

    async def execute(claimed: Operation) -> Operation:
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


async def test_scheduler_recovers_from_execution_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Continue polling after execution of a claimed operation fails."""

    # Arrange
    operation = leased_operation()
    claims = iter((operation, None))
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
        """Lease an operation once, then report an empty queue."""

        return next(claims)

    async def execute(_operation: Operation) -> Operation:
        """Simulate an operation execution failure."""

        raise RuntimeError("provider unavailable")

    async def sleep(_delay: float) -> None:
        """Stop after the scheduler returns to idle polling."""

        nonlocal sleeps
        sleeps += 1
        raise asyncio.CancelledError

    monkeypatch.setattr(operation_worker, "session_scope", fake_session_scope)
    monkeypatch.setattr(operation_worker.operations, "claim", claim)
    monkeypatch.setattr(operation_worker, "execute", execute)
    monkeypatch.setattr(operation_worker.asyncio, "sleep", sleep)

    # Act and assert
    with pytest.raises(asyncio.CancelledError):
        await operation_worker.run_operation_scheduler()

    assert sleeps == 1
