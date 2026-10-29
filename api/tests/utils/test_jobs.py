import pytest
import asyncio
import pytest_asyncio
from uuid import UUID
from types import SimpleNamespace
from fastapi import HTTPException
from datetime import UTC, datetime, timedelta
from factories import claim_operation, queue_operation, fetch_operations
from functools import partial
from src.utils import jobs as operation_worker
from src.models.operations import OperationKind, OperationStatus
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.operations import Operation


def leased_operation() -> Operation:
    """Build one claimed Operation."""

    return Operation(
        kind=OperationKind.organization_create,
        target_id=UUID("22222222-2222-2222-2222-222222222222"),
        lease_expires_at=datetime.now(UTC) + timedelta(minutes=1),
    )


async def test_execute_finishes_terminal_transition_when_cancelled(monkeypatch: pytest.MonkeyPatch, operation: Operation) -> None:
    """Finish the claimed Operation transition before propagating cancellation."""

    # Arrange
    started = asyncio.Event()
    release = asyncio.Event()
    complete = operation_worker.operations.complete

    async def complete_handler(target_id: UUID) -> None:
        """Complete one claimed Operation."""

        assert target_id == operation.target_id

    monkeypatch.setitem(operation_worker.handlers, operation.kind, complete_handler)

    async def delayed_complete(session: AsyncSession, operation_id: UUID) -> bool:
        """Delay the terminal transition until after worker cancellation."""

        assert operation_id == operation.id
        started.set()
        await release.wait()
        return await complete(session, operation_id)

    monkeypatch.setattr(operation_worker.operations, "complete", delayed_complete)

    # Act
    execution = asyncio.create_task(operation_worker.execute(operation))
    try:
        await asyncio.wait_for(started.wait(), timeout=3)
        execution.cancel()
        await asyncio.sleep(0)
        execution.cancel()
        await asyncio.sleep(0)
        release.set()

        # Assert cancellation from the worker, never cancellation from the diagnostic timeout.
        with pytest.raises(asyncio.CancelledError):
            await asyncio.wait_for(asyncio.shield(execution), timeout=3)
    finally:

        # Unblock persistence and reap the worker even if an assertion or wait fails.
        release.set()
        execution.cancel()
        async with asyncio.timeout(3):
            await asyncio.gather(execution, return_exceptions=True)

    # Read the committed terminal outcome through an independent session.
    [persisted] = await fetch_operations()
    assert persisted.id == operation.id
    assert persisted.status == OperationStatus.completed
    assert persisted.finished_at is not None
    assert persisted.lease_expires_at is None


@pytest.mark.no_db
async def test_finish_transition_preserves_cancellation_when_terminal_persistence_fails() -> None:
    """Propagate cancellation when its protected terminal transition also fails."""

    # Arrange
    started = asyncio.Event()
    release = asyncio.Event()

    async def fail(_session: object, _operation_id: UUID, reason: str) -> bool:
        """Fail only after cancellation reaches the protected transition."""

        assert reason == "Operation cancelled"
        started.set()
        await release.wait()
        raise RuntimeError("database unavailable")

    # Act
    transition = asyncio.create_task(operation_worker._finish_transition(partial(fail, reason="Operation cancelled"), UUID(int=1)))
    try:
        await asyncio.wait_for(started.wait(), timeout=3)
        transition.cancel()
        await asyncio.sleep(0)
        release.set()

        # Assert cancellation from the transition, never cancellation from the diagnostic timeout.
        with pytest.raises(asyncio.CancelledError):
            await asyncio.wait_for(asyncio.shield(transition), timeout=3)
    finally:

        # Unblock and reap the protected transition on failures as well as normal cancellation.
        release.set()
        transition.cancel()
        async with asyncio.timeout(3):
            await asyncio.gather(transition, return_exceptions=True)


@pytest_asyncio.fixture
async def operation() -> Operation:
    """Provide one persisted Operation with its active worker claim."""

    # Arrange the same committed queue and claim prerequisites for execution tests.
    queued = await queue_operation(target_id=UUID("22222222-2222-2222-2222-222222222222"))
    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.id == queued.id
    assert claimed.status == OperationStatus.active
    return claimed


HANDLER_FAILURES = [
    pytest.param(HTTPException(status_code=403, detail="workload deployment failed"), "workload deployment failed", id="http-error"),
    pytest.param(RuntimeError("provider unavailable"), "RuntimeError: provider unavailable", id="unexpected-error"),
]


# Handler failures persist a stable queue-visible reason.
@pytest.mark.parametrize(("failure", "expected_reason"), HANDLER_FAILURES)
async def test_execute_persists_handler_failure(
    monkeypatch: pytest.MonkeyPatch, operation: Operation, failure: HTTPException | RuntimeError, expected_reason: str
) -> None:
    """Persist a handler failure as the one claimed Operation's terminal outcome."""

    # Arrange
    async def failing_handler(target_id: UUID) -> None:
        """Raise one expected terminal failure."""

        assert target_id == operation.target_id
        raise failure

    monkeypatch.setitem(operation_worker.handlers, operation.kind, failing_handler)

    # Act
    await operation_worker.execute(operation)

    # Assert the committed outcome, including no successor work.
    [persisted] = await fetch_operations()
    assert persisted.id == operation.id
    assert persisted.status == OperationStatus.failed
    assert persisted.failed == expected_reason
    assert persisted.finished_at is not None
    assert persisted.lease_expires_at is None


async def test_execute_fails_operation_when_handler_times_out(monkeypatch: pytest.MonkeyPatch, operation: Operation) -> None:
    """Cancel a stalled handler and persist its terminal timeout failure."""

    # Arrange
    cancelled = asyncio.Event()
    monkeypatch.setattr(operation_worker, "OPERATION_TIMEOUT_SECONDS", 0.01)

    async def stalled_handler(target_id: UUID) -> None:
        """Wait for the worker deadline to interrupt a real pending handler."""

        assert target_id == operation.target_id
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.set()

    monkeypatch.setitem(operation_worker.handlers, operation.kind, stalled_handler)

    # Act
    async with asyncio.timeout(1):
        await operation_worker.execute(operation)

    # Assert
    assert cancelled.is_set()

    # Verify timeout committed a failure and cleared the lease without queuing work.
    [persisted] = await fetch_operations()
    assert persisted.id == operation.id
    assert persisted.status == OperationStatus.failed
    assert persisted.failed == "Operation timed out after 0.01 seconds"
    assert persisted.finished_at is not None
    assert persisted.lease_expires_at is None


async def test_execute_releases_operation_when_handler_is_cancelled(monkeypatch: pytest.MonkeyPatch, operation: Operation) -> None:
    """Release an interrupted Operation before propagating handler cancellation."""

    # Arrange
    async def cancelled_handler(_target_id: UUID) -> None:
        """Model worker shutdown while the handler is executing."""

        raise asyncio.CancelledError

    monkeypatch.setitem(operation_worker.handlers, operation.kind, cancelled_handler)

    # Act and assert
    with pytest.raises(asyncio.CancelledError):
        await operation_worker.execute(operation)

    # Verify shutdown committed only a lease release, not a terminal outcome or successor.
    [persisted] = await fetch_operations()
    assert persisted.id == operation.id
    assert persisted.status == OperationStatus.scheduled
    assert persisted.finished_at is None
    assert persisted.failed is None
    assert persisted.lease_expires_at is None


@pytest.mark.no_db
@pytest.mark.parametrize(
    "lease_expires_at", [pytest.param(None, id="missing"), pytest.param(datetime(2020, 1, 1, tzinfo=UTC), id="expired")]
)
async def test_execute_rejects_operation_without_a_live_worker_lease(lease_expires_at: datetime | None) -> None:
    """Reject Operations with missing or expired leases before reaching a handler."""

    # Arrange
    operation = Operation(
        kind=OperationKind.organization_create, target_id=UUID("22222222-2222-2222-2222-222222222222"), lease_expires_at=lease_expires_at
    )

    # Act and assert
    with pytest.raises(ValueError, match="Operation must be claimed before execution"):
        await operation_worker.execute(operation)


async def test_execute_rejects_lost_terminal_operation_lock(monkeypatch: pytest.MonkeyPatch, operation: Operation) -> None:
    """Reject a terminal outcome that could not release the claimed operation lock."""

    # Arrange
    async def complete_handler(target_id: UUID) -> None:
        """Complete successfully after another transaction releases the worker lease."""

        assert target_id == operation.target_id

        # Commit the lost lease before the worker attempts its real terminal transition.
        async with operation_worker.session_scope() as session:
            assert await operation_worker.operations.release(session, operation.id) is True
            await session.commit()

    monkeypatch.setitem(operation_worker.handlers, operation.kind, complete_handler)

    # Act and assert
    with pytest.raises(RuntimeError) as exc_info:
        await operation_worker.execute(operation)
    assert str(exc_info.value) == f"Operation '{operation.id}' lock was lost"

    # Verify the lost lock left only the unfinished, unleased Operation available to retry.
    [persisted] = await fetch_operations()
    assert persisted.id == operation.id
    assert persisted.status == OperationStatus.scheduled
    assert persisted.finished_at is None
    assert persisted.lease_expires_at is None
    assert persisted.failed is None


SCHEDULER_FAILURES = [
    pytest.param(RuntimeError("database unavailable"), None, id="polling"),
    pytest.param(None, RuntimeError("provider unavailable"), id="execution"),
]


# Polling and execution failures must not stop the scheduler permanently.
@pytest.mark.no_db
@pytest.mark.parametrize(("polling_failure", "execution_failure"), SCHEDULER_FAILURES)
async def test_scheduler_recovers_from_worker_failures(
    monkeypatch: pytest.MonkeyPatch, polling_failure: RuntimeError | None, execution_failure: RuntimeError | None
) -> None:
    """Continue polling after claim and execution failures."""

    # Arrange
    operation = leased_operation()
    claims = iter((polling_failure, operation, None) if polling_failure is not None else (operation, None))
    executed: list[Operation] = []
    idle = asyncio.Event()

    async def claim(_session: AsyncSession) -> Operation | None:
        """Raise once when configured, then return queued Operations."""

        result = next(claims)
        if isinstance(result, Exception):
            raise result
        if result is None:
            idle.set()
        return result

    async def execute(claimed: Operation) -> None:
        """Record dispatched Operations before simulating an execution failure."""

        executed.append(claimed)
        if execution_failure is not None:
            raise execution_failure

    # Yield for recovery and cancellation without waiting through the real retry delay.
    async def sleep(_delay: float) -> None:
        """Suspend the scheduler without waiting for its retry interval."""

        await asyncio.sleep(0)

    # Replace only the scheduler module's timer boundary, not the shared asyncio module.
    monkeypatch.setattr(operation_worker, "asyncio", SimpleNamespace(sleep=sleep))
    monkeypatch.setattr(operation_worker.operations, "claim", claim)
    monkeypatch.setattr(operation_worker, "execute", execute)

    # Act
    scheduler = asyncio.create_task(operation_worker.run_operation_scheduler())
    try:
        async with asyncio.timeout(3):
            await idle.wait()
    finally:

        # Always stop and await the worker, even when recovery never reaches idle.
        scheduler.cancel()
        async with asyncio.timeout(1):
            with pytest.raises(asyncio.CancelledError):
                await scheduler

    # Assert
    assert executed == [operation]
