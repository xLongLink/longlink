from uuid import UUID
from typing import cast
from datetime import datetime, timedelta
from sqlmodel import col
from sqlalchemy import or_, case, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import QueryableAttribute, load_only
from collections.abc import Sequence
from sqlalchemy.engine import CursorResult
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.models.operations import OperationKind, OperationResource, OperationResponse
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization

OPERATION_LOG_RETENTION = timedelta(days=30)


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[OperationResponse], int]:
    """Return one newest-first page of platform operations."""

    # Load only fields needed by the operation response and its derived status.
    statement = (
        select(Operation)
        .options(
            load_only(
                cast(QueryableAttribute[UUID], Operation.id),
                cast(QueryableAttribute[OperationKind], Operation.kind),
                cast(QueryableAttribute[UUID], Operation.target_id),
                cast(QueryableAttribute[str | None], Operation.failed),
                cast(QueryableAttribute[datetime | None], Operation.lease_expires_at),
                cast(QueryableAttribute[datetime], Operation.created_at),
                cast(QueryableAttribute[datetime | None], Operation.finished_at),
            )
        )
        .order_by(col(Operation.created_at).desc(), col(Operation.id).desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)
    operations = result.all()

    # Group targets by their concrete resource table.
    compute_target_ids = [operation.target_id for operation in operations if operation.kind == OperationKind.compute_create]
    organization_target_ids = [
        operation.target_id
        for operation in operations
        if operation.kind in {OperationKind.organization_create, OperationKind.organization_delete}
    ]
    application_target_ids = [
        operation.target_id
        for operation in operations
        if operation.kind in {OperationKind.application_create, OperationKind.application_delete}
    ]

    # Load compact resource details for each target type.
    resource_names: dict[tuple[OperationKind, UUID], str] = {}
    if compute_target_ids:
        result = await session.execute(
            select(col(ComputeRegistry.id), col(ComputeRegistry.name)).where(col(ComputeRegistry.id).in_(compute_target_ids))
        )
        for resource_id, name in result.all():
            resource_names[(OperationKind.compute_create, resource_id)] = name

    if organization_target_ids:
        result = await session.execute(
            select(col(Organization.id), col(Organization.name)).where(col(Organization.id).in_(organization_target_ids))
        )
        for resource_id, name in result.all():
            resource_names[(OperationKind.organization_create, resource_id)] = name
            resource_names[(OperationKind.organization_delete, resource_id)] = name

    if application_target_ids:
        result = await session.execute(
            select(col(Application.id), col(Application.name)).where(col(Application.id).in_(application_target_ids))
        )
        for resource_id, name in result.all():
            resource_names[(OperationKind.application_create, resource_id)] = name
            resource_names[(OperationKind.application_delete, resource_id)] = name

    # Assemble response models with their resolved target resource.
    items: list[OperationResponse] = []
    for operation in operations:
        resource_name = resource_names.get((operation.kind, operation.target_id))
        items.append(
            OperationResponse(
                id=operation.id,
                kind=operation.kind,
                resource=OperationResource(id=operation.target_id, name=resource_name) if resource_name is not None else None,
                target_id=operation.target_id,
                status=operation.status,
                failed=operation.failed,
                created_at=operation.created_at,
                finished_at=operation.finished_at,
            )
        )

    # Count all operation history rows.
    count_result = await session.execute(select(func.count()).select_from(Operation))
    return items, count_result.scalar_one()


async def clear_expired_logs(session: AsyncSession) -> int:
    """Clear logs from Operations that finished outside the retention window."""

    # Load only expired diagnostic payloads while retaining their Operation history.
    result = await session.scalars(
        select(Operation)
        .options(load_only(cast(QueryableAttribute[list[str]], Operation.logs)))
        .where(col(Operation.finished_at) <= utcnow() - OPERATION_LOG_RETENTION)
    )
    expired_operations = result.all()

    # Clear only payloads that have not already been removed by an earlier cleanup.
    cleared = 0
    for operation in expired_operations:
        if not operation.logs:
            continue
        operation.logs = []
        cleared += 1
    return cleared


async def schedule_reconciliation(session: AsyncSession) -> None:
    """Schedule every release reconciliation target in dependency order."""

    # Reconcile every present resource and clean up every tombstone.
    compute_result = await session.scalars(select(col(ComputeRegistry.id)).order_by(col(ComputeRegistry.id)))
    compute_ids = compute_result.all()
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
        col(Operation.kind) == kind,
        col(Operation.target_id) == target_id,
        col(Operation.finished_at).is_(None),
        col(Operation.lease_expires_at).is_(None),
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
        .where(col(Operation.finished_at).is_(None))
        .order_by(
            case(
                (col(Operation.lease_expires_at) > now, 0),
                (col(Operation.lease_expires_at).is_not(None), 1),
                else_=2,
            ),
            col(Operation.created_at).asc(),
            col(Operation.id).asc(),
        )
        .limit(1)
    )
    if operation is None or operation.lease_expires_at is not None and operation.lease_expires_at > now:
        return None

    # Reclaim expired work or acquire unleased work without racing another scheduler.
    result = cast(
        CursorResult[tuple[()]],
        await session.execute(
            update(Operation)
            .where(
                col(Operation.id) == operation.id,
                col(Operation.finished_at).is_(None),
                or_(col(Operation.lease_expires_at).is_(None), col(Operation.lease_expires_at) <= now),
            )
            .values(lease_expires_at=now + timedelta(minutes=30))
        ),
    )
    if result.rowcount != 1:
        return None

    return operation


async def complete(session: AsyncSession, operation_id: UUID, logs: list[str] | None = None) -> Operation | None:
    """Complete one operation while the caller owns its unexpired lease."""

    # Complete only the currently leased operation.
    now = utcnow()
    return await session.scalar(
        update(Operation)
        .where(
            col(Operation.id) == operation_id,
            col(Operation.lease_expires_at) > now,
            col(Operation.finished_at).is_(None),
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
            col(Operation.id) == operation_id,
            col(Operation.lease_expires_at) > now,
            col(Operation.finished_at).is_(None),
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
            col(Operation.id) == operation_id,
            col(Operation.lease_expires_at) > now,
            col(Operation.finished_at).is_(None),
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
            .where(col(ComputeRegistry.id) == operation.target_id, col(ComputeRegistry.status) == Status.creating)
            .values(status=Status.failed)
        )
    elif operation.kind == OperationKind.organization_create:
        await session.execute(
            update(Organization)
            .where(col(Organization.id) == operation.target_id, col(Organization.status) == Status.creating)
            .values(status=Status.failed)
        )
    elif operation.kind == OperationKind.application_create:
        await session.execute(
            update(Application)
            .where(col(Application.id) == operation.target_id, col(Application.status) == Status.creating)
            .values(status=Status.failed)
        )

    return operation
