import pytest
import asyncio
from uuid import UUID
from datetime import timedelta
from functools import partial
from src.utils import jobs as operation_worker
from contextlib import asynccontextmanager
from collections.abc import Callable, Awaitable, AsyncIterator
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


def failed_transition(operation: Operation) -> Callable[[object, UUID, str], Awaitable[Operation]]:
    """Build a failure transition for one claimed Operation."""

    async def fail(_session: object, operation_id: UUID, reason: str) -> Operation:
        """Mark the expected Operation as failed."""

        assert operation_id == operation.id
        operation.failed = reason
        operation.finished_at = utcnow()
        return operation

    return fail


class SchedulerSession:
    """Provide the scheduler transaction boundary."""

    async def commit(self) -> None:
        """Commit a scheduler transaction."""


@asynccontextmanager
async def fake_scheduler_session_scope() -> AsyncIterator[SchedulerSession]:
    """Yield a disposable scheduler session."""

    yield SchedulerSession()


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


async def test_finish_transition_preserves_cancellation_when_terminal_persistence_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    """Propagate cancellation when its protected terminal transition also fails."""

    # Arrange
    started = asyncio.Event()
    release = asyncio.Event()

    async def fail(_session: object, _operation_id: UUID, reason: str) -> Operation:
        """Fail only after cancellation reaches the protected transition."""

        assert reason == "Operation cancelled"
        started.set()
        await release.wait()
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(operation_worker.operations, "fail", fail)

    # Act
    transition = asyncio.create_task(
        operation_worker._finish_transition(partial(operation_worker.operations.fail, reason="Operation cancelled"), UUID(int=1))
    )
    await started.wait()
    transition.cancel()
    await asyncio.sleep(0)
    release.set()

    # Assert
    with pytest.raises(asyncio.CancelledError):
        await transition


async def test_execute_persists_explicit_handler_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Persist a handler failure as the one claimed Operation's terminal outcome."""

    # Arrange
    operation = leased_operation()
    transitions: list[tuple[UUID, str]] = []

    async def failing_handler(target_id: UUID) -> str | None:
        """Return one explicit terminal failure."""

        assert target_id == operation.target_id
        return "workload deployment failed"

    async def fake_fail(_session: object, operation_id: UUID, reason: str) -> Operation:
        """Record the terminal failure transition."""

        transitions.append((operation_id, reason))
        operation.failed = reason
        operation.finished_at = utcnow()
        return operation

    monkeypatch.setattr(operation_worker.operations, "fail", fake_fail)

    # Act
    monkeypatch.setitem(operation_worker.handlers, operation.kind, failing_handler)

    result = await operation_worker.execute(operation)

    # Assert
    assert result.status == OperationStatus.failed
    assert transitions == [(operation.id, "workload deployment failed")]


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
    assert result.failed == "Operation timed out"


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
    assert result.failed == "Operation failed"


async def test_execute_logs_terminal_transition_failure_during_handler_cancellation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Preserve handler cancellation when recording its failure also fails."""

    # Arrange
    operation = leased_operation()

    async def cancelled_handler(_target_id: UUID) -> None:
        """Model worker shutdown while the handler is executing."""

        raise asyncio.CancelledError

    async def fail(_session: object, _operation_id: UUID, reason: str) -> Operation:
        """Model a database failure while recording cancellation."""

        assert reason == "Operation cancelled"
        raise RuntimeError("database unavailable")

    monkeypatch.setitem(operation_worker.handlers, operation.kind, cancelled_handler)
    monkeypatch.setattr(operation_worker.operations, "fail", fail)

    # Act and assert
    with pytest.raises(asyncio.CancelledError):
        await operation_worker.execute(operation)


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


async def test_execute_rejects_operation_with_an_expired_worker_lease() -> None:
    """Reject an Operation whose claim lease has already expired."""

    # Arrange
    operation = leased_operation()
    operation.lease_expires_at = utcnow() - timedelta(seconds=1)

    # Act and assert
    with pytest.raises(ValueError, match="Operation must be claimed before execution"):
        await operation_worker.execute(operation)


async def test_execute_completes_successful_operation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Complete a claimed Operation when its handler reports no failure reason."""

    # Arrange
    operation = leased_operation()
    transitions: list[UUID] = []

    async def complete_handler(target_id: UUID) -> None:
        """Finish the expected target successfully."""

        assert target_id == operation.target_id

    async def complete(_session: object, operation_id: UUID) -> Operation:
        """Record the terminal success transition."""

        transitions.append(operation_id)
        operation.finished_at = utcnow()
        return operation

    monkeypatch.setitem(operation_worker.handlers, operation.kind, complete_handler)
    monkeypatch.setattr(operation_worker.operations, "complete", complete)

    # Act
    result = await operation_worker.execute(operation)

    # Assert
    assert result is operation
    assert result.status == OperationStatus.completed
    assert transitions == [operation.id]


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


@pytest.mark.parametrize(
    ("polling_failure", "execution_failure", "expected_execution_count", "expected_sleep_count"),
    [
        pytest.param(RuntimeError("database unavailable"), None, 1, 2, id="polling"),
        pytest.param(None, RuntimeError("provider unavailable"), 0, 1, id="execution"),
    ],
)
async def test_scheduler_recovers_from_worker_failures(
    monkeypatch: pytest.MonkeyPatch,
    polling_failure: RuntimeError | None,
    execution_failure: RuntimeError | None,
    expected_execution_count: int,
    expected_sleep_count: int,
) -> None:
    """Continue polling after claim and execution failures."""

    # Arrange
    operation = leased_operation()
    claims = iter((polling_failure, operation, None) if polling_failure is not None else (operation, None))
    executed: list[Operation] = []
    sleeps = 0

    async def claim(_session: SchedulerSession) -> Operation | None:
        """Raise once when configured, then return queued Operations."""

        result = next(claims)
        if isinstance(result, Exception):
            raise result
        return result

    async def execute(claimed: Operation) -> Operation:
        """Record dispatched Operations or simulate an execution failure."""

        if execution_failure is not None:
            raise execution_failure
        executed.append(claimed)
        return claimed

    async def sleep(_delay: float) -> None:
        """Stop after the scheduler proves it returned to idle polling."""

        nonlocal sleeps
        sleeps += 1
        if sleeps == expected_sleep_count:
            raise asyncio.CancelledError

    monkeypatch.setattr(operation_worker, "session_scope", fake_scheduler_session_scope)
    monkeypatch.setattr(operation_worker.operations, "claim", claim)
    monkeypatch.setattr(operation_worker, "execute", execute)
    monkeypatch.setattr(operation_worker.asyncio, "sleep", sleep)

    # Act and assert
    with pytest.raises(asyncio.CancelledError):
        await operation_worker.run_operation_scheduler()

    assert len(executed) == expected_execution_count
    assert sleeps == expected_sleep_count
