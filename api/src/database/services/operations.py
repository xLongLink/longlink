from uuid import UUID
from datetime import timedelta
from sqlmodel import col
from sqlalchemy import or_, case, func, select, update
from sqlalchemy.exc import IntegrityError
from collections.abc import Sequence
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[Operation], int]:
    """Return one newest-first page of platform operations."""

    # Query one stable page of operation history.
    statement = (
        select(Operation).order_by(Operation.created_at.desc(), Operation.id.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count all operation history rows.
    count_result = await session.execute(select(func.count()).select_from(Operation))
    return result.all(), count_result.scalar_one()


async def schedule_reconciliation(session: AsyncSession) -> None:
    """Schedule every release reconciliation target in dependency order."""

    # Reconcile every present resource and clean up every tombstone.
    result = await session.execute(select(col(ComputeRegistry.id)).order_by(col(ComputeRegistry.id)))
    compute_ids = result.scalars().all()
    result = await session.execute(
        select(col(Organization.id), col(Organization.deleted_at).is_not(None)).order_by(col(Organization.compute_id), col(Organization.id))
    )
    organization_rows = result.all()
    result = await session.execute(
        select(col(Application.id), col(Application.deleted_at).is_not(None))
        .join(Organization, col(Organization.id) == col(Application.organization_id))
        .where(col(Organization.deleted_at).is_(None))
        .order_by(col(Organization.compute_id), col(Application.id))
    )
    application_rows = result.all()

    # Create or reuse every desired-state operation in one transaction.
    for compute_id in compute_ids:
        await enqueue(session, kind=OperationKind.compute_create, target_id=compute_id)
    for organization_id, deleted in organization_rows:
        await enqueue(
            session,
            kind=OperationKind.organization_delete if deleted else OperationKind.organization_create,
            target_id=organization_id,
        )
    for application_id, deleted in application_rows:
        await enqueue(
            session,
            kind=OperationKind.application_delete if deleted else OperationKind.application_create,
            target_id=application_id,
        )


async def enqueue(
    session: AsyncSession,
    *,
    kind: OperationKind,
    target_id: UUID,
) -> Operation:
    """Add one Platform operation to an existing command transaction."""

    # Reuse unleased work and preserve active work as an immutable retry boundary.
    statement = select(Operation).where(
        Operation.kind == kind,
        Operation.target_id == target_id,
        Operation.finished_at.is_(None),
        Operation.lease_expires_at.is_(None),
    )
    operation = await session.scalar(statement)
    if operation is not None:
        return operation

    # Let the partial unique index serialize concurrent creation of the same unleased work.
    try:
        async with session.begin_nested():
            operation = Operation(kind=kind, target_id=target_id)
            session.add(operation)
            await session.flush()
    except IntegrityError:
        operation = await session.scalar(statement)
        if operation is None:
            raise
    return operation


async def claim(session: AsyncSession) -> Operation | None:
    """Claim the next unfinished Operation."""

    # A single active lease prevents conflicting provider and gateway mutations across Platform replicas.
    now = utcnow()

    # Classify the active lease, expired lease, or next Operation.
    operation = await session.scalar(
        select(Operation)
        .where(Operation.finished_at.is_(None))
        .order_by(
            case(
                (col(Operation.lease_expires_at) > now, 0),
                (col(Operation.lease_expires_at).is_not(None), 1),
                else_=2,
            ),
            Operation.created_at.asc(),
            Operation.id.asc(),
        )
        .limit(1)
    )
    if operation is None or (operation.lease_expires_at is not None and operation.lease_expires_at > now):
        return None

    # Reclaim expired work or acquire unleased work without racing another scheduler.
    if (
        await session.execute(
            update(Operation)
            .where(
                Operation.id == operation.id,
                Operation.finished_at.is_(None),
                or_(col(Operation.lease_expires_at).is_(None), col(Operation.lease_expires_at) <= now),
            )
            .values(lease_expires_at=now + timedelta(minutes=30))
        )
    ).rowcount != 1:
        return None

    await session.refresh(operation)
    return operation


async def complete(session: AsyncSession, operation_id: UUID, logs: list[str] | None = None) -> Operation | None:
    """Complete one operation while the caller owns its unexpired lease."""

    # Complete only the currently leased operation.
    now = utcnow()
    return await session.scalar(
        update(Operation)
        .where(
            Operation.id == operation_id,
            col(Operation.lease_expires_at) > now,
            Operation.finished_at.is_(None),
        )
        .values(finished_at=now, lease_expires_at=None, logs=[] if logs is None else logs)
        .returning(Operation)
    )


async def release(session: AsyncSession, operation_id: UUID) -> Operation | None:
    """Release one interrupted Operation for another worker to resume."""

    # Release only work still owned by this worker.
    now = utcnow()
    return await session.scalar(
        update(Operation)
        .where(
            Operation.id == operation_id,
            col(Operation.lease_expires_at) > now,
            Operation.finished_at.is_(None),
        )
        .values(lease_expires_at=None)
        .returning(Operation)
    )


async def fail(session: AsyncSession, operation_id: UUID, reason: str, logs: list[str] | None = None) -> Operation | None:
    """Fail one leased Operation."""

    # Mark only an unfinished Operation that remains leased terminal.
    now = utcnow()
    operation = await session.scalar(
        update(Operation)
        .where(
            Operation.id == operation_id,
            col(Operation.lease_expires_at) > now,
            Operation.finished_at.is_(None),
        )
        .values(
            failed=(reason.strip() or "Operation failed")[:500],
            finished_at=now,
            lease_expires_at=None,
            logs=[] if logs is None else logs,
        )
        .returning(Operation)
    )
    if operation is None:
        return None

    # Expose failed creation work on its target without changing deletion lifecycle state.
    if operation.kind == OperationKind.compute_create:
        await session.execute(
            update(ComputeRegistry)
            .where(ComputeRegistry.id == operation.target_id, ComputeRegistry.status == Status.creating)
            .values(status=Status.failed)
        )
    elif operation.kind == OperationKind.organization_create:
        await session.execute(
            update(Organization)
            .where(Organization.id == operation.target_id, Organization.status == Status.creating)
            .values(status=Status.failed)
        )
    elif operation.kind == OperationKind.application_create:
        await session.execute(
            update(Application)
            .where(Application.id == operation.target_id, Application.status == Status.creating)
            .values(status=Status.failed)
        )

    return operation
