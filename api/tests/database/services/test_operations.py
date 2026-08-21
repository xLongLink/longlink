from uuid import uuid4
from datetime import timedelta
from factories import create_compute, fail_operation, claim_operation, fetch_operations, complete_operation
from factories import queue_operation as queue
from src.models.types import DatabaseSSLMode
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind, OperationStatus
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def test_operations_service_fetch_returns_newest_operations_first() -> None:
    """Return compute creation operations ordered by creation time descending."""

    # Seed two operations with explicit creation timestamps.
    older_compute = await create_compute("older")
    newer_compute = await create_compute("newer")
    older_operation = await queue(target_id=older_compute.id)
    newer_operation = await queue(target_id=newer_compute.id)

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        assert older_row is not None
        older_row.created_at = utcnow() - timedelta(days=1)
        await session.commit()

    # Verify operations are returned newest first.
    assert [operation.id for operation in await fetch_operations()] == [newer_operation.id, older_operation.id]


async def test_operations_service_create_coalesces_and_reopens_completed_work() -> None:
    """Coalesce unfinished work by target and create successors after completion."""

    # Seed duplicate and independent resource lifecycle targets.
    compute = await create_compute("local")
    first_application_id = uuid4()
    organization_id = uuid4()

    # Create duplicate and independent work for one compute.
    application = await queue(
        kind=OperationKind.application_create,
        target_id=first_application_id,
    )
    duplicate = await queue(
        kind=OperationKind.application_create,
        target_id=first_application_id,
    )
    await queue(
        kind=OperationKind.organization_create,
        target_id=organization_id,
    )
    fetched = await fetch_operations()

    # Verify coalescing is scoped to each operation kind and target.
    assert duplicate.id == application.id
    assert len(fetched) == 2
    assert {(item.kind, item.target_id) for item in fetched} == {
        (OperationKind.application_create, first_application_id),
        (OperationKind.organization_create, organization_id),
    }

    # Completed work no longer coalesces with a later desired-state request.
    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.id == application.id
    completed = await complete_operation(claimed.id)
    replacement = await queue(
        kind=OperationKind.application_create,
        target_id=first_application_id,
    )

    assert completed is not None
    assert replacement.id != application.id


async def test_operations_service_schedules_all_active_application_creation_once() -> None:
    """Queue one reconciliation Operation for every Application lifecycle state."""

    compute = await create_compute("local")
    database = DatabaseRegistry(
        name="Primary Database",
        host="database.example",
        port=5432,
        username="admin",
        password="secret",
        sslmode=DatabaseSSLMode.disable,
    )
    storage = StorageRegistry(
        name="Primary Storage",
        endpoint_url="https://sos-ch-gva-2.exo.io",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )
    async with session_scope() as session:
        session.add_all([database, storage])
        await session.flush()
        organization = Organization(
            name="Acme",
            slug="acme",
            compute_id=compute.id,
            database_id=database.id,
            storage_id=storage.id,
            status=Status.running,
        )
        session.add(organization)
        await session.flush()
        running = Application(
            organization_id=organization.id,
            name="Dashboard",
            slug="dashboard",
            image_desired="ghcr.io/longlink/dashboard@sha256:resolved",
            secrets={},
            status=Status.running,
        )
        pending = Application(
            organization_id=organization.id,
            name="Pending",
            slug="pending",
            image_desired="ghcr.io/longlink/pending@sha256:resolved",
            secrets={},
            status=Status.creating,
        )
        deleted = Application(
            organization_id=organization.id,
            name="Deleted",
            slug="deleted",
            image_desired="ghcr.io/longlink/deleted@sha256:resolved",
            secrets={},
            status=Status.running,
            deleted_at=utcnow(),
        )
        session.add_all([running, pending, deleted])
        await session.commit()

    async with session_scope() as session:
        await operations.schedule_reconciliation(session)
        await session.commit()
    scheduled = {(operation.kind, operation.target_id) for operation in await fetch_operations()}

    assert scheduled == {
        (OperationKind.compute_create, compute.id),
        (OperationKind.organization_create, organization.id),
        (OperationKind.application_create, running.id),
        (OperationKind.application_create, pending.id),
        (OperationKind.application_delete, deleted.id),
    }


async def test_operations_service_claim_claims_oldest_available_operation() -> None:
    """Claim the oldest available compute creation first."""

    # Seed two operations with explicit creation order.
    older_compute = await create_compute("older")
    newer_compute = await create_compute("newer")
    older_operation = await queue(target_id=older_compute.id)
    await queue(target_id=newer_compute.id)

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        assert older_row is not None
        older_row.created_at = utcnow() - timedelta(days=1)
        await session.commit()

    # Claim the next globally available operation.
    claimed = await claim_operation()

    # Verify the oldest operation receives an active lease.
    assert claimed is not None
    assert claimed.id == older_operation.id


async def test_operations_service_claim_serializes_active_and_expires_lost_work() -> None:
    """Globally serialize active work and make expired claimed Operations terminal."""

    # Seed active and waiting work.
    compute = await create_compute("local")
    waiting_compute = await create_compute("waiting")
    await queue(target_id=compute.id)
    waiting = await queue(target_id=waiting_compute.id)

    # Exercise serialization and terminal states.
    active_claim = await claim_operation()
    second_active_claim = await claim_operation()
    assert active_claim is not None
    await complete_operation(active_claim.id)
    waiting_claim = await claim_operation()
    assert waiting_claim is not None
    await complete_operation(waiting_claim.id)
    finished_claim = await claim_operation()

    expired_compute = await create_compute("expired")
    expired = await queue(target_id=expired_compute.id)
    expired_claim = await claim_operation()
    assert expired_claim is not None
    async with session_scope() as session:
        row = await session.get(Operation, expired.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()
    replacement_claim = await claim_operation()
    expired_row = next(item for item in await fetch_operations() if item.id == expired.id)

    # Verify only eligible waiting work was claimed.
    assert second_active_claim is None
    assert waiting_claim.id == waiting.id
    assert finished_claim is None
    assert replacement_claim is None
    assert expired_row.status == OperationStatus.failed
    assert expired_row.lease_expires_at is None


async def test_operations_service_expired_leases_cannot_complete() -> None:
    """Fail expired work without completing its Operation."""

    # Claim an operation and expire its only lease.
    compute = await create_compute("local")
    operation = await queue(target_id=compute.id)
    claimed = await claim_operation()
    assert claimed is not None

    # Expire the worker lease before it can persist an outcome.
    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()
    expired_completion = await complete_operation(operation.id)
    expired_failure = await fail_operation(operation.id)
    row = next(item for item in await fetch_operations() if item.id == operation.id)

    # Verify an expired lease cannot complete its terminal Operation.
    assert expired_completion is None
    assert expired_failure is not None
    assert row.status == OperationStatus.failed
    assert row.finished_at is not None


async def test_operations_service_creates_follow_up_after_claimed_work() -> None:
    """Keep claimed work immutable while coalescing one unclaimed follow-up."""

    # Seed and claim one operation.
    compute = await create_compute("local")
    operation = await queue(target_id=compute.id)
    claimed = await claim_operation()
    assert claimed is not None

    # Create duplicate desired state while the claimed Operation remains immutable.
    follow_up = await queue(target_id=compute.id)
    duplicate = await queue(target_id=compute.id)

    # Verify one separate unclaimed follow-up represents the newer request.
    assert claimed.id == operation.id
    assert claimed.status == OperationStatus.active
    assert follow_up.id != operation.id
    assert duplicate.id == follow_up.id
    assert follow_up.status == OperationStatus.scheduled
    assert follow_up.lease_expires_at is None
