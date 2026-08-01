import pytest
import asyncio
from uuid import UUID
from datetime import timedelta
from src.utils import jobs as operation_worker
from longlink.utils.time import utcnow
from src.models.operations import OperationKind, OperationStatus
from src.database.models.operations import Operation

pytestmark = pytest.mark.no_db


class StopScheduler(RuntimeError):
    """Raised by test sleep calls to exit the infinite scheduler loop."""


def leased_operation() -> Operation:
    """Build one claimed compute reconciliation Operation."""

    return Operation(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        kind=OperationKind.compute_reconcile,
        target_id=UUID("22222222-2222-2222-2222-222222222222"),
        platform_version="v1.2.3",
        lease_expires_at=utcnow() + timedelta(minutes=1),
    )


async def test_operation_scheduler_claims_and_executes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Claim compute work, execute it, and keep polling."""

    # Arrange
    operation = leased_operation()
    claims = [operation, None]
    executed: list[Operation] = []

    async def fake_claim() -> Operation | None:
        """Return one operation and then no work."""

        return claims.pop(0)

    async def fake_execute(claimed: Operation, supplied_handler: operation_worker.OperationHandler) -> Operation:
        """Record executed operations."""

        executed.append(claimed)
        return claimed

    async def fake_sleep(seconds: float) -> None:
        """Stop the scheduler once it reaches the idle polling sleep."""

        raise StopScheduler()

    monkeypatch.setattr(operation_worker.operations, "claim", fake_claim)
    monkeypatch.setattr(operation_worker, "execute", fake_execute)
    monkeypatch.setattr(operation_worker.asyncio, "sleep", fake_sleep)

    # Act
    with pytest.raises(StopScheduler):
        await operation_worker.run_operation_scheduler()

    # Assert
    assert executed == [operation]


async def test_execute_raises_when_location_lease_is_lost(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a stale worker result when its final lease transition no longer owns the row."""

    # Arrange
    operation = leased_operation()

    async def complete_handler(claimed: Operation) -> str | None:
        """Complete one claimed compute Operation."""

        assert claimed is operation
        return None

    async def fake_complete(operation_id: UUID) -> None:
        """Report that the worker no longer owns the operation lease."""

        assert operation_id == operation.id
        return None

    monkeypatch.setattr(operation_worker.operations, "complete", fake_complete)

    # Act and assert
    with pytest.raises(RuntimeError, match=str(operation.id)):
        await operation_worker.execute(operation, complete_handler)


async def test_execute_finishes_terminal_transition_when_cancelled(monkeypatch: pytest.MonkeyPatch) -> None:
    """Finish the claimed Operation transition before propagating cancellation."""

    # Arrange
    operation = leased_operation()
    completed = leased_operation()
    completed.finished_at = utcnow()
    started = asyncio.Event()
    release = asyncio.Event()

    async def complete_handler(claimed: Operation) -> str | None:
        """Complete one claimed Operation."""

        assert claimed is operation
        return None

    async def fake_complete(operation_id: UUID) -> Operation:
        """Delay the terminal transition until after worker cancellation."""

        assert operation_id == operation.id
        started.set()
        await release.wait()
        return completed

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
    assert completed.status == OperationStatus.completed


async def test_execute_persists_explicit_handler_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Persist a handler failure as the one claimed Operation's terminal outcome."""

    # Arrange
    operation = leased_operation()
    transitions: list[UUID] = []
    errors: list[str] = []

    async def failing_handler(claimed: Operation) -> str | None:
        """Return one explicit terminal failure."""

        assert claimed is operation
        return "workload deployment failed"

    async def fake_fail(operation_id: UUID) -> Operation:
        """Record the terminal failure transition."""

        transitions.append(operation_id)
        return Operation(
            id=operation_id,
            kind=operation.kind,
            target_id=operation.target_id,
            failed=True,
            platform_version=operation.platform_version,
            finished_at=utcnow(),
        )

    def log_error(message: str, *args: object) -> None:
        """Capture the formatted terminal error."""

        errors.append(message % args)

    monkeypatch.setattr(operation_worker.operations, "fail", fake_fail)
    monkeypatch.setattr(operation_worker.logger, "error", log_error)

    # Act
    result = await operation_worker.execute(operation, failing_handler)

    # Assert
    assert result.status == OperationStatus.failed
    assert transitions == [operation.id]
    assert errors == [f"Operation {operation.id} failed: workload deployment failed"]
