import pytest
import asyncio
from uuid import UUID
from datetime import datetime, timedelta
from src.utils import jobs as operation_worker
from longlink.utils.time import utcnow
from src.models.operations import OperationKind, OperationStatus, ReconciliationScope
from src.database.models.operations import Operation

pytestmark = pytest.mark.no_db


class StopScheduler(RuntimeError):
    """Raised by test sleep calls to exit the infinite scheduler loop."""


def leased_operation(attempt_count: int = 1) -> Operation:
    """Build one claimed compute reconciliation Operation."""

    return Operation(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        kind=OperationKind.compute,
        target_id=UUID("22222222-2222-2222-2222-222222222222"),
        compute_id=UUID("22222222-2222-2222-2222-222222222222"),
        scope=ReconciliationScope.application,
        platform_version="v1.2.3",
        attempt_count=attempt_count,
        started_at=datetime.fromisoformat("2026-07-01T09:00:00+00:00"),
        lease_expires_at=utcnow() + timedelta(minutes=1),
    )


async def test_operation_scheduler_claims_and_executes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Claim compute work, execute it, and keep polling."""

    # Arrange
    operation = leased_operation()
    completed = leased_operation()
    completed.stopped_at = datetime.fromisoformat("2026-07-01T09:01:00+00:00")
    claims = [operation, None]
    executed: list[Operation] = []

    async def handler(claimed: Operation) -> operation_worker.OperationOutcome:
        """Return the scheduler handler outcome if the real executor invokes it."""

        assert claimed is operation
        return operation_worker.complete()

    async def fake_claim_next() -> Operation | None:
        """Return one operation and then no work."""

        return claims.pop(0)

    async def fake_execute(claimed: Operation, supplied_handler: operation_worker.JobHandler) -> Operation:
        """Record executed operations."""

        assert supplied_handler is handler
        executed.append(claimed)
        return completed

    async def fake_sleep(seconds: float) -> None:
        """Stop the scheduler once it reaches the idle polling sleep."""

        raise StopScheduler()

    monkeypatch.setattr(operation_worker.operations, "claim_next", fake_claim_next)
    monkeypatch.setattr(operation_worker, "execute", fake_execute)
    monkeypatch.setattr(operation_worker.asyncio, "sleep", fake_sleep)
    monkeypatch.setitem(operation_worker.handlers, OperationKind.compute, handler)

    # Act
    with pytest.raises(StopScheduler):
        await operation_worker.run_operation_scheduler()

    # Assert
    assert executed == [operation]


async def test_execute_retries_location_work_with_exponential_backoff(monkeypatch: pytest.MonkeyPatch) -> None:
    """Log a handler-requested retry and persist bounded exponential backoff."""

    # Arrange
    operation = leased_operation(attempt_count=3)
    transitions: list[tuple[UUID, int, float]] = []
    warnings: list[str] = []

    async def retry_handler(claimed: Operation) -> operation_worker.OperationOutcome:
        """Request another attempt for the claimed compute target."""

        assert claimed is operation
        return operation_worker.retry("workloads are starting")

    async def fake_defer(operation_id: UUID, attempt_count: int, delay: float) -> Operation:
        """Record the retry transition and return scheduled work."""

        transitions.append((operation_id, attempt_count, delay))
        return Operation(
            id=operation_id,
            kind=operation.kind,
            target_id=operation.target_id,
            compute_id=operation.compute_id,
            scope=operation.scope,
            platform_version=operation.platform_version,
            attempt_count=operation.attempt_count,
        )

    def log_warning(message: str, *args: object) -> None:
        """Capture the formatted retry warning."""

        warnings.append(message % args)

    monkeypatch.setattr(operation_worker.operations, "defer", fake_defer)
    monkeypatch.setattr(operation_worker.logger, "warning", log_warning)

    # Act
    result = await operation_worker.execute(operation, retry_handler)

    # Assert
    assert result.status == OperationStatus.scheduled
    assert transitions == [(operation.id, operation.attempt_count, 20)]
    assert warnings == [f"Operation {operation.id} will retry: workloads are starting"]


async def test_execute_raises_when_location_lease_is_lost(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a stale worker result when its final lease transition no longer owns the row."""

    # Arrange
    operation = leased_operation()

    async def complete_handler(claimed: Operation) -> operation_worker.OperationOutcome:
        """Complete one claimed compute attempt."""

        assert claimed is operation
        return operation_worker.complete()

    async def fake_complete(operation_id: UUID, attempt_count: int) -> None:
        """Report that the worker no longer owns the operation lease."""

        assert operation_id == operation.id
        assert attempt_count == operation.attempt_count
        return None

    monkeypatch.setattr(operation_worker.operations, "complete", fake_complete)

    # Act and assert
    with pytest.raises(RuntimeError, match=str(operation.id)):
        await operation_worker.execute(operation, complete_handler)


async def test_execute_fails_retry_at_attempt_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail rather than defer when the sixth operation attempt requests another retry."""

    # Arrange
    operation = leased_operation(attempt_count=operation_worker.OPERATION_ATTEMPT_LIMIT)
    transitions: list[tuple[UUID, int]] = []
    errors: list[str] = []

    async def retry_handler(claimed: Operation) -> operation_worker.OperationOutcome:
        """Request a retry after consuming the complete attempt budget."""

        assert claimed is operation
        return operation_worker.retry("workloads are still starting")

    async def fake_fail(operation_id: UUID, attempt_count: int) -> Operation:
        """Record terminal failure after the attempt budget is exhausted."""

        transitions.append((operation_id, attempt_count))
        return Operation(
            id=operation_id,
            kind=operation.kind,
            target_id=operation.target_id,
            compute_id=operation.compute_id,
            failed=True,
            scope=operation.scope,
            platform_version=operation.platform_version,
            attempt_count=attempt_count,
            stopped_at=utcnow(),
        )

    def log_error(message: str, *args: object) -> None:
        """Capture the formatted terminal error."""

        errors.append(message % args)

    monkeypatch.setattr(operation_worker.operations, "fail", fake_fail)
    monkeypatch.setattr(operation_worker.logger, "error", log_error)

    # Act
    result = await operation_worker.execute(operation, retry_handler)

    # Assert
    assert result.status == OperationStatus.failed
    assert operation_worker.OPERATION_ATTEMPT_LIMIT == 6
    assert transitions == [(operation.id, 6)]
    assert errors == [f"Operation {operation.id} failed after 6 attempts: workloads are still starting"]
