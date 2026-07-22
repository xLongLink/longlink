import pytest
from datetime import timedelta
from src.environments import env
from longlink.utils.time import utcnow
from src.models.operations import OperationStatus
from src.database.session import session_scope
from src.database.services import operations
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


async def create_compute(slug: str) -> ComputeRegistry:
    """Create one isolated compute row without queueing reconciliation."""

    # Operation service tests need only a minimal compute target at the current Platform version.
    async with session_scope() as session:
        compute = ComputeRegistry(
            name=slug.title(),
            slug=slug,
            kubeconfig="apiVersion: v1\nclusters: []\n",
            proxy_secret="proxy-secret",
            version=env.VERSION,
        )
        session.add(compute)
        await session.commit()
        await session.refresh(compute)
        return compute


async def test_operations_service_fetch_returns_newest_operations_first() -> None:
    """Return compute reconciliation operations ordered by creation time descending."""

    # Arrange
    older_compute = await create_compute("older")
    newer_compute = await create_compute("newer")
    older_operation = await operations.enqueue(older_compute.id)
    newer_operation = await operations.enqueue(newer_compute.id)

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        newer_row = await session.get(Operation, newer_operation.id)
        assert older_row is not None
        assert newer_row is not None
        older_row.created_at = utcnow() - timedelta(days=1)
        newer_row.created_at = utcnow()
        await session.commit()

    # Act
    fetched = await operations.fetch()

    # Assert
    assert [operation.id for operation in fetched] == [newer_operation.id, older_operation.id]
    assert all(operation.platform_version == env.VERSION for operation in fetched)


async def test_operations_service_enqueue_coalesces_and_expires_active_lease() -> None:
    """Coalesce compute work and immediately supersede an active attempt after a desired change."""

    # Arrange
    compute = await create_compute("local")
    first = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    assert claimed.lease_expires_at is not None

    # Act
    periodic = await operations.enqueue(compute.id, desired_change=False)
    changed = await operations.enqueue(compute.id)
    stale_completion = await operations.complete(claimed.id, claimed.attempt_count)
    replacement = await operations.claim_next()
    fetched = await operations.fetch()

    # Assert
    assert periodic.id == first.id
    assert periodic.lease_expires_at == claimed.lease_expires_at
    assert changed.id == first.id
    assert changed.lease_expires_at is not None
    assert changed.lease_expires_at <= utcnow()
    assert stale_completion is None
    assert replacement is not None
    assert replacement.id == first.id
    assert replacement.attempt_count == 2
    assert len(fetched) == 1
    assert fetched[0].compute_id == compute.id


async def test_operations_service_enqueue_separates_computes_and_reopens_completed_work() -> None:
    """Keep compute queues independent and permit new work after completion."""

    # Arrange
    first_compute = await create_compute("first")
    second_compute = await create_compute("second")
    first = await operations.enqueue(first_compute.id)
    second = await operations.enqueue(second_compute.id)

    # Act
    claimed = await operations.claim_next()
    assert claimed is not None
    completed = await operations.complete(claimed.id, claimed.attempt_count)
    replacement = await operations.enqueue(claimed.compute_id)
    open_operations = [operation for operation in await operations.fetch() if operation.stopped_at is None]

    # Assert
    assert first.id != second.id
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert replacement.id not in {first.id, second.id}
    assert len(open_operations) == 2


async def test_operations_service_claim_next_claims_oldest_available_operation() -> None:
    """Claim the oldest available compute reconciliation first."""

    # Arrange
    older_compute = await create_compute("older")
    newer_compute = await create_compute("newer")
    older_operation = await operations.enqueue(older_compute.id)
    newer_operation = await operations.enqueue(newer_compute.id)

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        newer_row = await session.get(Operation, newer_operation.id)
        assert older_row is not None
        assert newer_row is not None
        older_row.created_at = utcnow() - timedelta(days=1)
        newer_row.created_at = utcnow()
        await session.commit()

    # Act
    claimed = await operations.claim_next()

    # Assert
    assert claimed is not None
    assert claimed.id == older_operation.id
    assert claimed.status == OperationStatus.active
    assert claimed.attempt_count == 1
    assert claimed.lease_expires_at is not None


async def test_operations_service_claim_ignores_active_and_stopped_operations() -> None:
    """Do not claim compute work with a current lease, terminal state, or exhausted budget."""

    # Arrange
    compute = await create_compute("local")
    await operations.enqueue(compute.id)

    # Act
    active_claim = await operations.claim_next()
    second_active_claim = await operations.claim_next()
    assert active_claim is not None
    await operations.complete(active_claim.id, active_claim.attempt_count)
    stopped_claim = await operations.claim_next()

    exhausted_compute = await create_compute("exhausted")
    exhausted = await operations.enqueue(exhausted_compute.id)
    async with session_scope() as session:
        row = await session.get(Operation, exhausted.id)
        assert row is not None
        row.attempt_count = operations.OPERATION_ATTEMPT_LIMIT
        row.started_at = utcnow() - timedelta(minutes=1)
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()
    exhausted_claim = await operations.claim_next()
    exhausted_row = next(item for item in await operations.fetch() if item.id == exhausted.id)

    # Assert
    assert second_active_claim is None
    assert stopped_claim is None
    assert exhausted_claim is None
    assert exhausted_row.status == OperationStatus.failed
    assert exhausted_row.attempt_count == operations.OPERATION_ATTEMPT_LIMIT


async def test_operations_service_lease_updates_reject_stale_attempts() -> None:
    """Require the current unexpired attempt generation for every worker state mutation."""

    # Arrange
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    assert claimed.lease_expires_at is not None

    # Expire and reclaim the first attempt so its generation becomes stale.
    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()
    reclaimed = await operations.claim_next()
    assert reclaimed is not None
    assert reclaimed.attempt_count == claimed.attempt_count + 1
    assert reclaimed.lease_expires_at is not None

    # Act
    stale_lease = await operations.lease_is_current(operation.id, claimed.attempt_count)
    stale_renewal = await operations.renew_lease(operation.id, claimed.attempt_count)
    stale_defer = await operations.defer(operation.id, claimed.attempt_count, 0)
    stale_completion = await operations.complete(operation.id, claimed.attempt_count)
    stale_failure = await operations.fail(operation.id, "boom", claimed.attempt_count)
    current_lease = await operations.lease_is_current(operation.id, reclaimed.attempt_count)
    renewed = await operations.renew_lease(operation.id, reclaimed.attempt_count)
    assert renewed is not None

    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()

    expired_lease = await operations.lease_is_current(operation.id, reclaimed.attempt_count)
    expired_renewal = await operations.renew_lease(operation.id, reclaimed.attempt_count)
    expired_defer = await operations.defer(operation.id, reclaimed.attempt_count, 0)
    expired_completion = await operations.complete(operation.id, reclaimed.attempt_count)
    expired_failure = await operations.fail(operation.id, "boom", reclaimed.attempt_count)

    # Assert
    assert stale_lease is False
    assert stale_renewal is None
    assert stale_defer is None
    assert stale_completion is None
    assert stale_failure is None
    assert current_lease is True
    assert renewed.lease_expires_at is not None
    assert renewed.lease_expires_at >= reclaimed.lease_expires_at
    assert expired_lease is False
    assert expired_renewal is None
    assert expired_defer is None
    assert expired_completion is None
    assert expired_failure is None


async def test_operations_service_tracks_successful_and_failed_lifecycles() -> None:
    """Track claimed compute work through both terminal lifecycle states."""

    # Arrange
    successful_compute = await create_compute("successful")
    failed_compute = await create_compute("failed")
    successful = await operations.enqueue(successful_compute.id)
    failed = await operations.enqueue(failed_compute.id)

    # Act
    successful_claim = await operations.claim_next()
    assert successful_claim is not None
    completed = await operations.complete(successful_claim.id, successful_claim.attempt_count)
    failed_claim = await operations.claim_next()
    assert failed_claim is not None
    stopped = await operations.fail(failed_claim.id, "boom", failed_claim.attempt_count)

    # Assert
    assert successful.status == OperationStatus.scheduled
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert completed.stopped_at is not None
    assert completed.error is None
    assert failed.status == OperationStatus.scheduled
    assert stopped is not None
    assert stopped.status == OperationStatus.failed
    assert stopped.stopped_at is not None
    assert stopped.error == "boom"


async def test_operations_service_defers_and_retries_compute_work() -> None:
    """Release transiently failed work and lease its next attempt."""

    # Arrange
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    deferred = await operations.defer(operation.id, claimed.attempt_count, 0, "temporary failure")
    retried = await operations.claim_next()

    # Assert
    assert deferred is not None
    assert deferred.status == OperationStatus.scheduled
    assert deferred.error == "temporary failure"
    assert deferred.attempt_count == 1
    assert deferred.started_at is None
    assert deferred.stopped_at is None
    assert deferred.lease_expires_at is None
    assert retried is not None
    assert retried.id == operation.id
    assert retried.status == OperationStatus.active
    assert retried.attempt_count == 2
    assert retried.lease_expires_at is not None


async def test_operations_service_platform_upgrade_supersedes_leased_work(monkeypatch: pytest.MonkeyPatch) -> None:
    """Supersede a leased operation when a newer Platform release becomes the target."""

    # Arrange
    monkeypatch.setattr(env, "VERSION", "v1.0.0")
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Exhaust this row's attempt budget so the newer release receives a fresh operation.
    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.attempt_count = operations.OPERATION_ATTEMPT_LIMIT
        await session.commit()
    claimed.attempt_count = operations.OPERATION_ATTEMPT_LIMIT

    # Act
    monkeypatch.setattr(env, "VERSION", "v1.1.0")
    upgraded = await operations.enqueue(compute.id, desired_change=False)
    stale_completion = await operations.complete(operation.id, claimed.attempt_count)
    replacement = await operations.claim_next()
    monkeypatch.setattr(env, "VERSION", "v1.0.0")

    # Assert
    assert upgraded.id != operation.id
    assert upgraded.platform_version == "v1.1.0"
    assert upgraded.attempt_count == 0
    assert upgraded.lease_expires_at is None
    assert stale_completion is None
    assert replacement is not None
    assert replacement.id == upgraded.id
    assert replacement.platform_version == "v1.1.0"
    assert replacement.attempt_count == 1
    assert replacement.lease_expires_at is not None
    with pytest.raises(RuntimeError, match="downgrade from v1.1.0 to v1.0.0 is not supported"):
        await operations.reject_platform_downgrade()
