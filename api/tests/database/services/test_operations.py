import pytest
from uuid import uuid4
from datetime import timedelta
from factories import (
    create_compute,
    fail_operation,
    claim_operation,
    fetch_operations,
    complete_operation,
    create_ready_infrastructure,
)
from factories import queue_operation as queue
from sqlalchemy.exc import IntegrityError
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind, OperationStatus
from src.models.pagination import Pagination
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def test_operations_service_fetch_returns_newest_operations_first() -> None:
    """Return compute creation operations ordered by creation time descending."""

    older_operation = await queue(target_id=uuid4())
    newer_operation = await queue(target_id=uuid4())

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        assert older_row is not None
        older_row.created_at = utcnow() - timedelta(days=1)
        await session.commit()

    assert [operation.id for operation in await fetch_operations()] == [newer_operation.id, older_operation.id]


async def test_operations_service_fetch_page_returns_total_history() -> None:
    """Retain complete Operation history after expired logs are cleared."""

    # Arrange
    first_operation = await queue(target_id=uuid4())
    second_operation = await queue(target_id=uuid4())
    async with session_scope() as session:
        first_row = await session.get(Operation, first_operation.id)
        second_row = await session.get(Operation, second_operation.id)
        assert first_row is not None
        assert second_row is not None
        first_row.finished_at = utcnow() - timedelta(days=31)
        first_row.logs = ["expired"]
        second_row.finished_at = utcnow() - timedelta(days=29)
        second_row.logs = ["retained"]
        await session.commit()

    # Act
    async with session_scope() as session:
        cleared = await operations.clear_expired_logs(session)
        await session.commit()
        first_row = await session.get(Operation, first_operation.id)
        second_row = await session.get(Operation, second_operation.id)
        page, total = await operations.fetch_page(session, Pagination(page_size=1))

    # Assert
    assert cleared == 1
    assert len(page) == 1
    assert page[0].id in {first_operation.id, second_operation.id}
    assert total == 2
    assert first_row is not None
    assert first_row.logs == []
    assert second_row is not None
    assert second_row.logs == ["retained"]


async def test_operations_service_enqueue_uses_concurrently_created_operation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return the unleased operation created by another transaction during an insert race."""

    # Arrange
    concurrent_operation = Operation(kind=OperationKind.compute_create, target_id=uuid4())
    scalar_calls = 0

    async def return_concurrent_operation(_statement: object) -> Operation | None:
        """Model the matching operation appearing after the unique-index conflict."""

        nonlocal scalar_calls
        scalar_calls += 1
        return None if scalar_calls == 1 else concurrent_operation

    async def raise_unique_conflict() -> None:
        """Model a competing transaction winning the operation insert race."""

        raise IntegrityError("INSERT", {}, Exception("unique constraint"))

    # Act
    async with session_scope() as session:
        monkeypatch.setattr(session, "scalar", return_concurrent_operation)
        monkeypatch.setattr(session, "flush", raise_unique_conflict)
        operation = await operations.enqueue(session, kind=concurrent_operation.kind, target_id=concurrent_operation.target_id)

    # Assert
    assert operation is concurrent_operation


async def test_operations_service_enqueue_reraises_unresolved_insert_conflict(monkeypatch: pytest.MonkeyPatch) -> None:
    """Expose an insert conflict when no competing Operation can be recovered."""

    # Arrange
    conflict = IntegrityError("INSERT", {}, Exception("unique constraint"))

    async def return_no_operation(_statement: object) -> None:
        """Model an unavailable competing Operation after the insert conflict."""

    async def raise_unique_conflict() -> None:
        """Model an insert conflict without a visible winning transaction."""

        raise conflict

    # Act and assert
    async with session_scope() as session:
        monkeypatch.setattr(session, "scalar", return_no_operation)
        monkeypatch.setattr(session, "flush", raise_unique_conflict)
        with pytest.raises(IntegrityError) as error:
            await operations.enqueue(session, kind=OperationKind.compute_create, target_id=uuid4())

    assert error.value is conflict


async def test_operations_service_create_coalesces_and_reopens_completed_work() -> None:
    """Coalesce unfinished work by target and create successors after completion."""

    first_application_id = uuid4()
    organization_id = uuid4()

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

    assert duplicate.id == application.id
    assert len(fetched) == 2
    assert {(item.kind, item.target_id) for item in fetched} == {
        (OperationKind.application_create, first_application_id),
        (OperationKind.organization_create, organization_id),
    }

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

    infrastructure = await create_ready_infrastructure()
    async with session_scope() as session:
        organization = Organization(
            name="Acme",
            slug="acme",
            compute_id=infrastructure.compute.id,
            database_id=infrastructure.database.id,
            storage_id=infrastructure.storage.id,
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
        deleted = Application(
            organization_id=organization.id,
            name="Deleted",
            slug="deleted",
            image_desired="ghcr.io/longlink/deleted@sha256:resolved",
            secrets={},
            status=Status.running,
            deleted_at=utcnow(),
        )
        session.add(running)
        session.add(deleted)
        await session.commit()

    async with session_scope() as session:
        await operations.schedule_reconciliation(session)
        await session.commit()
    scheduled = {(operation.kind, operation.target_id) for operation in await fetch_operations()}

    assert scheduled == {
        (OperationKind.compute_create, infrastructure.compute.id),
        (OperationKind.organization_create, organization.id),
        (OperationKind.application_create, running.id),
        (OperationKind.application_delete, deleted.id),
    }


async def test_operations_service_schedules_only_organization_deletion_for_deleted_organization() -> None:
    """Queue only parent cleanup when an Organization and its Applications are deleted."""

    infrastructure = await create_ready_infrastructure()
    async with session_scope() as session:
        organization = Organization(
            name="Deleted Acme",
            slug="deleted-acme",
            compute_id=infrastructure.compute.id,
            database_id=infrastructure.database.id,
            storage_id=infrastructure.storage.id,
            deleted_at=utcnow(),
        )
        session.add(organization)
        await session.flush()
        application = Application(
            organization_id=organization.id,
            name="Deleted Dashboard",
            slug="deleted-dashboard",
            image_desired="ghcr.io/longlink/dashboard@sha256:resolved",
            secrets={},
            deleted_at=utcnow(),
        )
        session.add(application)
        await session.commit()

    async with session_scope() as session:
        await operations.schedule_reconciliation(session)
        await session.commit()
    scheduled = {(operation.kind, operation.target_id) for operation in await fetch_operations()}

    assert scheduled == {
        (OperationKind.compute_create, infrastructure.compute.id),
        (OperationKind.organization_delete, organization.id),
    }


async def test_operations_service_claim_claims_oldest_available_operation() -> None:
    """Claim the oldest available compute creation first."""

    older_operation = await queue(target_id=uuid4())
    await queue(target_id=uuid4())

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        assert older_row is not None
        older_row.created_at = utcnow() - timedelta(days=1)
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
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
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
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
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


async def test_operations_service_failed_creation_updates_targets_and_resolves_resources() -> None:
    """Expose failed creation work with its concrete failed resource."""

    # Arrange
    compute = await create_compute()
    infrastructure = await create_ready_infrastructure()
    async with session_scope() as session:
        organization = Organization(
            name="Acme",
            slug="acme",
            compute_id=infrastructure.compute.id,
            database_id=infrastructure.database.id,
            storage_id=infrastructure.storage.id,
        )
        session.add(organization)
        await session.flush()
        application = Application(
            organization_id=organization.id,
            name="Dashboard",
            slug="dashboard",
            image_desired="ghcr.io/longlink/dashboard@sha256:resolved",
            secrets={},
        )
        session.add(application)
        await session.commit()

    compute_operation = await queue(kind=OperationKind.compute_create, target_id=compute.id)
    compute_claim = await claim_operation()
    assert compute_claim is not None
    assert compute_claim.id == compute_operation.id
    assert await fail_operation(compute_operation.id, "compute creation failed") is not None

    organization_operation = await queue(kind=OperationKind.organization_create, target_id=organization.id)
    organization_claim = await claim_operation()
    assert organization_claim is not None
    assert organization_claim.id == organization_operation.id
    assert await fail_operation(organization_operation.id, "organization creation failed") is not None

    application_operation = await queue(kind=OperationKind.application_create, target_id=application.id)
    application_claim = await claim_operation()
    assert application_claim is not None
    assert application_claim.id == application_operation.id
    assert await fail_operation(application_operation.id, "application creation failed") is not None

    # Act
    async with session_scope() as session:
        compute_row = await session.get(ComputeRegistry, compute.id)
        organization_row = await session.get(Organization, organization.id)
        application_row = await session.get(Application, application.id)
        items, total = await operations.fetch_page(session, Pagination())

    # Assert
    assert compute_row is not None
    assert compute_row.status == Status.failed
    assert organization_row is not None
    assert organization_row.status == Status.failed
    assert application_row is not None
    assert application_row.status == Status.failed
    assert total == 3

    items_by_kind = {item.kind: item for item in items}
    compute_item = items_by_kind[OperationKind.compute_create]
    organization_item = items_by_kind[OperationKind.organization_create]
    application_item = items_by_kind[OperationKind.application_create]
    assert compute_item.resource is not None
    assert compute_item.resource.id == compute.id
    assert compute_item.resource.name == compute.name
    assert compute_item.status == OperationStatus.failed
    assert organization_item.resource is not None
    assert organization_item.resource.id == organization.id
    assert organization_item.resource.name == organization.name
    assert organization_item.status == OperationStatus.failed
    assert application_item.resource is not None
    assert application_item.resource.id == application.id
    assert application_item.resource.name == application.name
    assert application_item.status == OperationStatus.failed


async def test_operations_service_creates_follow_up_after_claimed_work() -> None:
    """Keep claimed work immutable while coalescing one unclaimed follow-up."""

    # Seed and claim one operation.
    target_id = uuid4()
    await queue(target_id=target_id)
    claimed = await claim_operation()
    assert claimed is not None

    # Create duplicate desired state while the claimed Operation remains immutable.
    follow_up = await queue(target_id=target_id)
    duplicate = await queue(target_id=target_id)

    # Verify one separate unclaimed follow-up represents the newer request.
    assert claimed.status == OperationStatus.active
    assert follow_up.id != claimed.id
    assert duplicate.id == follow_up.id
    assert follow_up.status == OperationStatus.scheduled
