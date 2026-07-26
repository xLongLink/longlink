import setup as platform_setup
import pytest
from uuid import uuid4
from datetime import timedelta
from src.environments import env
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind, OperationStatus
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


async def test_operations_service_enqueue_coalesces_each_kind_and_target() -> None:
    """Keep compute and explicit resource lifecycle Operations independently coalesced."""

    # Arrange
    compute = await create_compute("local")
    first_application_id = uuid4()
    organization_id = uuid4()
    first = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    assert claimed.lease_expires_at is not None

    # Act
    application = await operations.enqueue(
        compute.id,
        kind=OperationKind.application_create,
        target_id=first_application_id,
    )
    duplicate = await operations.enqueue(
        compute.id,
        kind=OperationKind.application_create,
        target_id=first_application_id,
    )
    organization = await operations.enqueue(
        compute.id,
        kind=OperationKind.organization_create,
        target_id=organization_id,
    )
    stale_completion = await operations.complete(claimed.id, claimed.attempt_count)
    replacement = await operations.claim_next()
    fetched = await operations.fetch()

    # Assert
    assert duplicate.id == application.id
    assert application.kind == OperationKind.application_create
    assert application.target_id == first_application_id
    assert organization.kind == OperationKind.organization_create
    assert organization.target_id == organization_id
    assert stale_completion is not None
    assert replacement is not None
    assert replacement.id == application.id
    assert replacement.attempt_count == 1
    assert len(fetched) == 3
    assert {(item.kind, item.target_id) for item in fetched} == {
        (OperationKind.compute, compute.id),
        (OperationKind.application_create, first_application_id),
        (OperationKind.organization_create, organization_id),
    }


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
    replacement = await operations.enqueue(claimed.target_id)
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
    """Globally serialize active work and skip terminal or exhausted Operations."""

    # Arrange
    compute = await create_compute("local")
    waiting_compute = await create_compute("waiting")
    await operations.enqueue(compute.id)
    waiting = await operations.enqueue(waiting_compute.id)

    # Act
    active_claim = await operations.claim_next()
    second_active_claim = await operations.claim_next()
    assert active_claim is not None
    await operations.complete(active_claim.id, active_claim.attempt_count)
    waiting_claim = await operations.claim_next()
    assert waiting_claim is not None
    await operations.complete(waiting_claim.id, waiting_claim.attempt_count)
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
    assert waiting_claim.id == waiting.id
    assert stopped_claim is None
    assert exhausted_claim is None
    assert exhausted_row.status == OperationStatus.failed
    assert exhausted_row.attempt_count == operations.OPERATION_ATTEMPT_LIMIT


async def test_operations_service_transitions_reject_stale_attempts() -> None:
    """Require the current unexpired attempt generation for worker state transitions."""

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
    # Act
    stale_defer = await operations.defer(operation.id, claimed.attempt_count, 0)
    stale_completion = await operations.complete(operation.id, claimed.attempt_count)
    stale_failure = await operations.fail(operation.id, claimed.attempt_count)

    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        assert row.lease_expires_at is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()

    expired_defer = await operations.defer(operation.id, reclaimed.attempt_count, 0)
    expired_completion = await operations.complete(operation.id, reclaimed.attempt_count)
    expired_failure = await operations.fail(operation.id, reclaimed.attempt_count)

    # Assert
    assert stale_defer is None
    assert stale_completion is None
    assert stale_failure is None
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
    stopped = await operations.fail(failed_claim.id, failed_claim.attempt_count)

    # Assert
    assert successful.status == OperationStatus.scheduled
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert completed.stopped_at is not None
    assert completed.failed is False
    assert failed.status == OperationStatus.scheduled
    assert stopped is not None
    assert stopped.status == OperationStatus.failed
    assert stopped.stopped_at is not None
    assert stopped.failed is True


async def test_operations_service_defers_and_retries_compute_work() -> None:
    """Release transiently failed work and lease its next attempt."""

    # Arrange
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    deferred = await operations.defer(operation.id, claimed.attempt_count, 0)
    retried = await operations.claim_next()

    # Assert
    assert deferred is not None
    assert deferred.status == OperationStatus.scheduled
    assert deferred.attempt_count == 1
    assert deferred.started_at is None
    assert deferred.stopped_at is None
    assert deferred.lease_expires_at is None
    assert retried is not None
    assert retried.id == operation.id
    assert retried.status == OperationStatus.active
    assert retried.attempt_count == 2
    assert retried.lease_expires_at is not None


async def test_operations_service_platform_upgrade_queues_after_locked_work(monkeypatch: pytest.MonkeyPatch) -> None:
    """Queue a newer Platform release without interrupting locked work."""

    # Arrange
    monkeypatch.setattr(env, "VERSION", "v1.0.0")
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    monkeypatch.setattr(env, "VERSION", "v1.1.0")
    await platform_setup.schedule_migrations()
    await platform_setup.schedule_migrations()
    upgraded = next(
        item
        for item in await operations.fetch()
        if item.kind == OperationKind.compute and item.target_id == compute.id and item.stopped_at is None
    )
    completed = await operations.complete(operation.id, claimed.attempt_count)
    replacement = await operations.claim_next()
    monkeypatch.setattr(env, "VERSION", "v1.0.0")

    # Assert
    assert upgraded.id != operation.id
    assert upgraded.platform_version == "v1.1.0"
    assert upgraded.attempt_count == 0
    assert upgraded.lease_expires_at is None
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert replacement is not None
    assert replacement.id == upgraded.id
    assert replacement.platform_version == "v1.1.0"
    assert replacement.attempt_count == 1
    assert replacement.lease_expires_at is not None
