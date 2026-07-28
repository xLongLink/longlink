import pytest
from src import release as platform_release
from uuid import uuid4
from datetime import timedelta
from src.environments import env
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind, OperationStatus
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


async def create_compute(name: str) -> ComputeRegistry:
    """Create one isolated compute row without queueing reconciliation."""

    # Operation service tests need only a minimal compute target at the current Platform version.
    async with session_scope() as session:
        compute = ComputeRegistry(
            name=name.title(),
            kubeconfig="apiVersion: v1\nclusters: []\n",
            proxy_secret="proxy-secret",
            version=env.VERSION,
        )
        session.add(compute)
        await session.commit()
        return compute


async def test_operations_service_fetch_returns_newest_operations_first() -> None:
    """Return compute reconciliation operations ordered by creation time descending."""

    # Seed two operations with explicit creation timestamps.
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

    # Fetch operations through the service boundary.
    fetched = await operations.fetch()

    # Verify operations are returned newest first with their Platform version.
    assert [operation.id for operation in fetched] == [newer_operation.id, older_operation.id]
    assert all(operation.platform_version == env.VERSION for operation in fetched)


async def test_operations_service_enqueue_coalesces_each_kind_and_target() -> None:
    """Keep compute and explicit resource lifecycle Operations independently coalesced."""

    # Seed one claimed compute operation and distinct lifecycle targets.
    compute = await create_compute("local")
    first_application_id = uuid4()
    organization_id = uuid4()
    await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    assert claimed.lease_expires_at is not None

    # Enqueue duplicate and independent work around the stale completion.
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
    stale_completion = await operations.complete(claimed.id)
    replacement = await operations.claim_next()
    fetched = await operations.fetch()

    # Verify coalescing is scoped to each operation kind and target.
    assert duplicate.id == application.id
    assert application.kind == OperationKind.application_create
    assert application.target_id == first_application_id
    assert organization.kind == OperationKind.organization_create
    assert organization.target_id == organization_id
    assert stale_completion is not None
    assert replacement is not None
    assert replacement.id == application.id
    assert len(fetched) == 3
    assert {(item.kind, item.target_id) for item in fetched} == {
        (OperationKind.compute_reconcile, compute.id),
        (OperationKind.application_create, first_application_id),
        (OperationKind.organization_create, organization_id),
    }


async def test_operations_service_enqueue_separates_computes_and_reopens_completed_work() -> None:
    """Keep compute queues independent and permit new work after completion."""

    # Seed independent queues for two computes.
    first_compute = await create_compute("first")
    second_compute = await create_compute("second")
    first = await operations.enqueue(first_compute.id)
    second = await operations.enqueue(second_compute.id)

    # Complete one claim and enqueue replacement work for its compute.
    claimed = await operations.claim_next()
    assert claimed is not None
    completed = await operations.complete(claimed.id)
    replacement = await operations.enqueue(claimed.target_id)
    open_operations = [operation for operation in await operations.fetch() if operation.finished_at is None]

    # Verify completed work reopens without affecting the other compute queue.
    assert first.id != second.id
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert replacement.id not in {first.id, second.id}
    assert len(open_operations) == 2


async def test_operations_service_claim_next_claims_oldest_available_operation() -> None:
    """Claim the oldest available compute reconciliation first."""

    # Seed two operations with explicit creation order.
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

    # Claim the next globally available operation.
    claimed = await operations.claim_next()

    # Verify the oldest operation receives an active lease.
    assert claimed is not None
    assert claimed.id == older_operation.id
    assert claimed.status == OperationStatus.active
    assert claimed.lease_expires_at is not None


async def test_operations_service_claims_older_release_work(monkeypatch: pytest.MonkeyPatch) -> None:
    """Allow the current worker to finish pending work from an older Platform release."""

    # Seed work under the previous Platform release.
    monkeypatch.setattr(env, "VERSION", "v1.0.0")
    compute = await create_compute("older-release")
    operation = await operations.enqueue(compute.id)

    # Claim the existing work after the Platform upgrades.
    monkeypatch.setattr(env, "VERSION", "v1.1.0")
    claimed = await operations.claim_next()

    # Verify the current worker owns the pending older-release Operation.
    assert claimed is not None
    assert claimed.id == operation.id
    assert claimed.platform_version == "v1.0.0"


async def test_operations_service_claim_serializes_active_and_expires_lost_work() -> None:
    """Globally serialize active work and make expired claimed Operations terminal."""

    # Seed active and waiting work.
    compute = await create_compute("local")
    waiting_compute = await create_compute("waiting")
    await operations.enqueue(compute.id)
    waiting = await operations.enqueue(waiting_compute.id)

    # Exercise serialization and terminal states.
    active_claim = await operations.claim_next()
    second_active_claim = await operations.claim_next()
    assert active_claim is not None
    await operations.complete(active_claim.id)
    waiting_claim = await operations.claim_next()
    assert waiting_claim is not None
    await operations.complete(waiting_claim.id)
    finished_claim = await operations.claim_next()

    expired_compute = await create_compute("expired")
    expired = await operations.enqueue(expired_compute.id)
    expired_claim = await operations.claim_next()
    assert expired_claim is not None
    async with session_scope() as session:
        row = await session.get(Operation, expired.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()
    replacement_claim = await operations.claim_next()
    expired_row = next(item for item in await operations.fetch() if item.id == expired.id)
    async with session_scope() as session:
        expired_compute_row = await session.get(ComputeRegistry, expired_compute.id)

    # Verify only eligible waiting work was claimed.
    assert second_active_claim is None
    assert waiting_claim.id == waiting.id
    assert finished_claim is None
    assert replacement_claim is None
    assert expired_row.status == OperationStatus.failed
    assert expired_row.finished_at is not None
    assert expired_row.lease_expires_at is None
    assert expired_compute_row is not None
    assert expired_compute_row.status == Status.failed


async def test_operations_service_expiry_preserves_published_compute_success() -> None:
    """Fail an expired Operation without regressing its already published compute target."""

    # Claim reconciliation and publish its target before simulating worker loss.
    compute = await create_compute("published")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    async with session_scope() as session:
        operation_row = await session.get(Operation, operation.id)
        compute_row = await session.get(ComputeRegistry, compute.id)
        assert operation_row is not None
        assert compute_row is not None
        operation_row.lease_expires_at = utcnow() - timedelta(seconds=1)
        compute_row.status = Status.running
        await session.commit()

    # Reap the expired lease.
    replacement = await operations.claim_next()
    async with session_scope() as session:
        operation_row = await session.get(Operation, operation.id)
        compute_row = await session.get(ComputeRegistry, compute.id)

    # Verify only the abandoned Operation fails.
    assert replacement is None
    assert operation_row is not None
    assert operation_row.status == OperationStatus.failed
    assert compute_row is not None
    assert compute_row.status == Status.running


async def test_operations_service_transitions_reject_expired_leases_without_reclaiming() -> None:
    """Reject expired worker transitions and never assign the Operation again."""

    # Claim an operation and expire its only lease.
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    assert claimed.lease_expires_at is not None

    # Expire the worker lease before it can persist an outcome.
    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()
    expired_completion = await operations.complete(operation.id)
    expired_failure = await operations.fail(operation.id)
    replacement = await operations.claim_next()
    row = next(item for item in await operations.fetch() if item.id == operation.id)

    # Verify the expired worker cannot transition or reclaim its terminal Operation.
    assert expired_completion is None
    assert expired_failure is None
    assert replacement is None
    assert row.status == OperationStatus.failed
    assert row.finished_at is not None


async def test_operations_service_tracks_successful_and_failed_lifecycles() -> None:
    """Track claimed compute work through both terminal lifecycle states."""

    # Seed separate operations for successful and failed outcomes.
    successful_compute = await create_compute("successful")
    failed_compute = await create_compute("failed")
    successful = await operations.enqueue(successful_compute.id)
    failed = await operations.enqueue(failed_compute.id)

    # Drive each operation through its terminal transition.
    successful_claim = await operations.claim_next()
    assert successful_claim is not None
    completed = await operations.complete(successful_claim.id)
    failed_claim = await operations.claim_next()
    assert failed_claim is not None
    finished = await operations.fail(failed_claim.id)
    async with session_scope() as session:
        failed_compute_row = await session.get(ComputeRegistry, failed_compute.id)

    # Verify both terminal states retain their expected lifecycle metadata.
    assert successful.status == OperationStatus.scheduled
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert completed.finished_at is not None
    assert completed.failed is False
    assert failed.status == OperationStatus.scheduled
    assert finished is not None
    assert finished.status == OperationStatus.failed
    assert finished.finished_at is not None
    assert finished.failed is True
    assert failed_compute_row is not None
    assert failed_compute_row.status == Status.failed


async def test_operations_service_enqueues_follow_up_after_claimed_work() -> None:
    """Keep claimed work immutable while coalescing one unclaimed follow-up."""

    # Seed and claim one operation.
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Queue duplicate desired state while the claimed Operation remains immutable.
    follow_up = await operations.enqueue(compute.id)
    duplicate = await operations.enqueue(compute.id)

    # Verify one separate unclaimed follow-up represents the newer request.
    assert claimed.id == operation.id
    assert claimed.status == OperationStatus.active
    assert follow_up.id != operation.id
    assert duplicate.id == follow_up.id
    assert follow_up.status == OperationStatus.scheduled
    assert follow_up.lease_expires_at is None


async def test_operations_service_platform_upgrade_queues_after_locked_work(monkeypatch: pytest.MonkeyPatch) -> None:
    """Queue a newer Platform release without interrupting locked work."""

    # Claim compute work at the original Platform version.
    monkeypatch.setattr(env, "VERSION", "v1.0.0")
    compute = await create_compute("local")
    operation = await operations.enqueue(compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Schedule a newer Platform version while the original work remains locked.
    monkeypatch.setattr(env, "VERSION", "v1.1.0")
    await platform_release.schedule_migrations()
    await platform_release.schedule_migrations()
    upgraded = next(
        item
        for item in await operations.fetch()
        if item.kind == OperationKind.compute_reconcile and item.target_id == compute.id and item.finished_at is None
    )
    completed = await operations.complete(operation.id)
    replacement = await operations.claim_next()
    monkeypatch.setattr(env, "VERSION", "v1.0.0")

    # Verify one upgraded replacement waits for the original completion.
    assert upgraded.id != operation.id
    assert upgraded.platform_version == "v1.1.0"
    assert upgraded.lease_expires_at is None
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert replacement is not None
    assert replacement.id == upgraded.id
    assert replacement.platform_version == "v1.1.0"
    assert replacement.lease_expires_at is not None
