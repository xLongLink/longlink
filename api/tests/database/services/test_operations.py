from uuid import uuid4
from datetime import UTC, datetime, timedelta
from factories import (
    create_compute,
    fail_operation,
    claim_operation,
    fetch_operations,
    complete_operation,
)
from factories import queue_operation as queue
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind, OperationStatus
from src.models.pagination import Pagination
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def test_operations_service_create_coalesces_and_reopens_completed_work() -> None:
    """Coalesce unfinished work by target and create successors after completion."""

    first_solution_id = uuid4()
    organization_id = uuid4()

    solution = await queue(
        kind=OperationKind.solution_deploy,
        target_id=first_solution_id,
    )
    duplicate = await queue(
        kind=OperationKind.solution_deploy,
        target_id=first_solution_id,
    )
    await queue(
        kind=OperationKind.organization_create,
        target_id=organization_id,
    )
    fetched = await fetch_operations()

    assert duplicate.id == solution.id
    assert len(fetched) == 2
    assert {(item.kind, item.target_id) for item in fetched} == {
        (OperationKind.solution_deploy, first_solution_id),
        (OperationKind.organization_create, organization_id),
    }

    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.id == solution.id
    completed = await complete_operation(claimed.id)
    replacement = await queue(
        kind=OperationKind.solution_deploy,
        target_id=first_solution_id,
    )

    assert completed is not None
    assert replacement.id != solution.id


async def test_operations_service_claim_claims_oldest_available_operation() -> None:
    """Claim the oldest available Operation first."""

    older_operation = await queue(target_id=uuid4())
    await queue(target_id=uuid4())

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        assert older_row is not None
        older_row.created_at = datetime.now(UTC) - timedelta(days=1)
        await session.commit()

    claimed = await claim_operation()

    assert claimed is not None
    assert claimed.id == older_operation.id


async def test_operations_service_claim_serializes_active_work() -> None:
    """Allow only one active operation at a time."""

    await queue(target_id=uuid4())
    waiting = await queue(target_id=uuid4())

    active_claim = await claim_operation()
    assert active_claim is not None
    assert await claim_operation() is None

    await complete_operation(active_claim.id)
    waiting_claim = await claim_operation()
    assert waiting_claim is not None

    await complete_operation(waiting_claim.id)

    assert waiting_claim.id == waiting.id
    assert await claim_operation() is None


async def test_operations_service_claim_reclaims_expired_work() -> None:
    """Reclaim an operation abandoned by a worker after its lease expires."""

    # Seed and claim work that its worker will abandon.
    expired = await queue(target_id=uuid4())
    expired_claim = await claim_operation()
    assert expired_claim is not None

    # Expire the worker lease before the next claim attempt.
    async with session_scope() as session:
        row = await session.get(Operation, expired.id)
        assert row is not None
        row.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    reclaimed = await claim_operation()
    expired_row = next(item for item in await fetch_operations() if item.id == expired.id)

    # Verify another worker owns the abandoned work without making it terminal.
    assert reclaimed is not None
    assert reclaimed.id == expired.id
    assert expired_row.status == OperationStatus.active
    assert expired_row.lease_expires_at is not None
    assert expired_row.finished_at is None
    assert expired_row.failed is None


async def test_operations_service_expired_leases_cannot_finish() -> None:
    """Keep expired work available for another worker instead of finishing it."""

    # Claim an operation and expire its only lease.
    operation = await queue(target_id=uuid4())
    claimed = await claim_operation()
    assert claimed is not None

    # Expire the worker lease before it can persist an outcome.
    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    expired_completion = await complete_operation(operation.id)
    expired_failure = await fail_operation(operation.id)
    row = next(item for item in await fetch_operations() if item.id == operation.id)

    # Verify an expired worker cannot finish work it no longer owns.
    assert expired_completion is None
    assert expired_failure is None
    assert row.status == OperationStatus.scheduled
    assert row.finished_at is None


async def test_operations_service_records_bounded_failure_reason() -> None:
    """Persist a bounded failure reason in the failed operation field."""

    # Arrange
    operation = await queue(target_id=uuid4())
    claimed = await claim_operation()
    assert claimed is not None

    # Act
    failed = await fail_operation(operation.id, "migration job failed" * 100)

    # Assert
    assert failed is not None
    assert failed.failed == ("migration job failed" * 100)[:500]


async def test_operations_service_failed_creation_updates_targets_and_resolves_resource_names() -> None:
    """Expose failed creation work with its concrete failed resource names."""

    # Arrange
    compute_registry = await create_compute()
    async with session_scope() as session:
        organization = Organization(
            name="Acme",
            slug="acme",
            compute_id=compute_registry.id,
        )
        session.add(organization)
        await session.flush()
        solution = Solution(
            organization_id=organization.id,
            name="Dashboard",
            slug="dashboard",
            secrets={},
        )
        session.add(solution)
        await session.flush()
        revision = Revision(
            source="ghcr.io/longlink/dashboard:latest",
            solution_id=solution.id,
            image="ghcr.io/longlink/dashboard@sha256:resolved",
            envs={},
        )
        session.add(revision)
        await session.flush()
        solution.desired_revision_id = revision.id
        await session.commit()

    organization_operation = await queue(kind=OperationKind.organization_create, target_id=organization.id)
    organization_claim = await claim_operation()
    assert organization_claim is not None
    assert organization_claim.id == organization_operation.id
    assert await fail_operation(organization_operation.id, "organization creation failed") is not None

    solution_operation = await queue(kind=OperationKind.solution_deploy, target_id=solution.desired_revision_id)
    solution_claim = await claim_operation()
    assert solution_claim is not None
    assert solution_claim.id == solution_operation.id
    assert await fail_operation(solution_operation.id, "solution creation failed") is not None

    # Act
    async with session_scope() as session:
        organization_row = await session.get(Organization, organization.id)
        solution_row = await session.get(Solution, solution.id)
        items, total = await operations.fetch_page(session, Pagination())

    # Assert
    assert organization_row is not None
    assert organization_row.status == Status.failed
    assert solution_row is not None
    assert solution_row.status == Status.failed
    assert total == 2

    items_by_kind = {item.kind: item for item in items}
    organization_item = items_by_kind[OperationKind.organization_create]
    solution_item = items_by_kind[OperationKind.solution_deploy]
    assert organization_item.resource_name == organization.name
    assert organization_item.status == OperationStatus.failed
    assert solution_item.resource_name == solution.name
    assert solution_item.status == OperationStatus.failed


async def test_operations_service_coalesces_claimed_work() -> None:
    """Reuse claimed work and release it for another attempt."""

    # Seed and claim one operation.
    target_id = uuid4()
    await queue(target_id=target_id)
    claimed = await claim_operation()
    assert claimed is not None

    # Create duplicate desired state while the claimed Operation remains immutable.
    follow_up = await queue(target_id=target_id)

    # Verify the request reuses the lease and shutdown can release it safely.
    assert claimed.status == OperationStatus.active
    assert follow_up.id == claimed.id
    assert follow_up.status == OperationStatus.active
    async with session_scope() as session:
        released = await operations.release(session, claimed.id)
        await session.commit()
        assert released is not None
        assert released.status == OperationStatus.scheduled
        assert released.lease_expires_at is None


async def test_operations_service_complete_reenqueues_stale_effective_revision() -> None:
    """Requeue the effective revision when an outdated deploy completes."""

    # Arrange
    compute_registry = await create_compute()
    async with session_scope() as session:
        organization = Organization(name="Acme", slug="acme", compute_id=compute_registry.id)
        session.add(organization)
        await session.flush()
        solution = Solution(organization_id=organization.id, name="Dashboard", slug="dashboard", secrets={})
        session.add(solution)
        await session.flush()
        deployed_revision = Revision(
            source="ghcr.io/longlink/dashboard:1",
            solution_id=solution.id,
            image="ghcr.io/longlink/dashboard@sha256:one",
            envs={},
            deployed_at=datetime.now(UTC),
        )
        session.add(deployed_revision)
        await session.flush()
        effective_revision = Revision(
            source="ghcr.io/longlink/dashboard:2",
            solution_id=solution.id,
            image="ghcr.io/longlink/dashboard@sha256:two",
            envs={},
        )
        session.add(effective_revision)
        await session.flush()
        solution.desired_revision_id = effective_revision.id
        solution.deployed_revision_id = deployed_revision.id
        await session.commit()

    outdated = await queue(kind=OperationKind.solution_deploy, target_id=deployed_revision.id)
    assert await claim_operation() is not None

    # Act
    completed = await complete_operation(outdated.id)

    # Assert
    assert completed is not None
    follow_ups = [item for item in await fetch_operations() if item.target_id == effective_revision.id]
    assert len(follow_ups) == 1
    assert follow_ups[0].kind == OperationKind.solution_deploy


async def test_operations_service_fail_marks_revision_and_enqueues_fallback() -> None:
    """Mark a failed first deploy and requeue its last deployed revision."""

    # Arrange
    compute_registry = await create_compute()
    async with session_scope() as session:
        organization = Organization(name="Acme", slug="acme", compute_id=compute_registry.id)
        session.add(organization)
        await session.flush()
        solution = Solution(organization_id=organization.id, name="Dashboard", slug="dashboard", secrets={})
        session.add(solution)
        await session.flush()
        deployed_revision = Revision(
            source="ghcr.io/longlink/dashboard:1",
            solution_id=solution.id,
            image="ghcr.io/longlink/dashboard@sha256:one",
            envs={},
            deployed_at=datetime.now(UTC),
        )
        session.add(deployed_revision)
        await session.flush()
        desired_revision = Revision(
            source="ghcr.io/longlink/dashboard:2",
            solution_id=solution.id,
            image="ghcr.io/longlink/dashboard@sha256:two",
            envs={},
        )
        session.add(desired_revision)
        await session.flush()
        solution.desired_revision_id = desired_revision.id
        solution.deployed_revision_id = deployed_revision.id
        await session.commit()

    deploy = await queue(kind=OperationKind.solution_deploy, target_id=desired_revision.id)
    assert await claim_operation() is not None

    # Act
    failed = await fail_operation(deploy.id, "deploy failed")

    # Assert
    assert failed is not None
    async with session_scope() as session:
        persisted_revision = await session.get(Revision, desired_revision.id)
        persisted_solution = await session.get(Solution, solution.id)
        assert persisted_revision is not None
        assert persisted_revision.failed is True
        assert persisted_solution is not None
        assert persisted_solution.status == Status.failed
    fallbacks = [item for item in await fetch_operations() if item.target_id == deployed_revision.id]
    assert len(fallbacks) == 1
    assert fallbacks[0].kind == OperationKind.solution_deploy
