from uuid import UUID
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from sqlalchemy import Update, or_, case, func, select, update
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from src.models.statuses import Status
from src.models.operations import OperationKind, OperationResponse
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[OperationResponse], int]:
    """Return one newest-first page of platform operations."""

    # Load only fields needed by the operation response and its derived status.
    statement = (
        select(Operation)
        .options(
            load_only(
                Operation.id,
                Operation.kind,
                Operation.target_id,
                Operation.failed,
                Operation.lease_expires_at,
                Operation.created_at,
                Operation.finished_at,
            )
        )
        .order_by(col(Operation.created_at).desc(), col(Operation.id).desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)
    operations = result.all()

    # Group targets by their concrete resource table.
    organization_target_ids = {
        operation.target_id
        for operation in operations
        if operation.kind in {OperationKind.organization_create, OperationKind.organization_delete}
    }
    solution_target_ids = {operation.target_id for operation in operations if operation.kind == OperationKind.solution_delete}

    # Load compact resource details for each target type.
    resource_names: dict[tuple[OperationKind, UUID], str] = {}

    if organization_target_ids:
        result = await session.execute(
            select(col(Organization.id), col(Organization.name)).where(col(Organization.id).in_(organization_target_ids))
        )
        for resource_id, name in result:
            resource_names[(OperationKind.organization_create, resource_id)] = name
            resource_names[(OperationKind.organization_delete, resource_id)] = name

    if solution_target_ids:
        result = await session.execute(select(col(Solution.id), col(Solution.name)).where(col(Solution.id).in_(solution_target_ids)))
        for resource_id, name in result:
            resource_names[(OperationKind.solution_delete, resource_id)] = name

    revision_ids = {operation.target_id for operation in operations if operation.kind == OperationKind.solution_deploy}
    if revision_ids:
        result = await session.execute(
            select(col(Revision.id), col(Solution.name))
            .join(Solution, col(Solution.id) == col(Revision.solution_id))
            .where(col(Revision.id).in_(revision_ids))
        )
        for revision_id, name in result:
            resource_names[(OperationKind.solution_deploy, revision_id)] = name

    # Assemble response models with their resolved target resource name.
    items = [
        OperationResponse(
            id=operation.id,
            kind=operation.kind,
            target_id=operation.target_id,
            resource_name=resource_names.get((operation.kind, operation.target_id)),
            status=operation.status,
            failed=operation.failed,
            created_at=operation.created_at,
            finished_at=operation.finished_at,
        )
        for operation in operations
    ]

    # Count all operation history rows.
    count_result = await session.execute(select(func.count()).select_from(Operation))
    return items, count_result.scalar_one()


async def enqueue(
    session: AsyncSession,
    *,
    kind: OperationKind,
    target_id: UUID,
) -> Operation:
    """Coalesce unfinished work when visible, allowing duplicates from concurrent requests."""

    # Reuse unfinished work, including an active or interrupted attempt at this exact target.
    operation = await session.scalar(
        select(Operation)
        .where(
            col(Operation.kind) == kind,
            col(Operation.target_id) == target_id,
            col(Operation.finished_at).is_(None),
        )
        .order_by(col(Operation.created_at), col(Operation.id))
        .limit(1)
    )
    if operation is not None:
        return operation

    # Duplicate requests may queue repeated reconciliation; handlers must remain idempotent.
    operation = Operation(kind=kind, target_id=target_id)
    session.add(operation)
    return operation


async def claim(session: AsyncSession) -> Operation | None:
    """Claim the next unfinished Operation."""

    # A single active lease prevents conflicting provider and gateway mutations across Platform replicas.
    now = datetime.now(UTC)

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
    result = await session.execute(
        update(Operation)
        .where(
            col(Operation.id) == operation.id,
            col(Operation.finished_at).is_(None),
            or_(col(Operation.lease_expires_at).is_(None), col(Operation.lease_expires_at) <= now),
        )
        .values(lease_expires_at=now + timedelta(minutes=30))
    )
    if result.rowcount != 1:
        return None

    return operation


def _leased_operation_update(operation_id: UUID, now: datetime) -> Update:
    """Return the guarded update used only while the current worker owns a lease."""

    return (
        update(Operation)
        .where(
            col(Operation.id) == operation_id,
            col(Operation.lease_expires_at) > now,
            col(Operation.finished_at).is_(None),
        )
        .execution_options(synchronize_session=False)
    )


async def complete(session: AsyncSession, operation_id: UUID) -> Operation | None:
    """Complete one operation while the caller owns its unexpired lease."""

    # Complete only the currently leased operation.
    now = datetime.now(UTC)
    result = await session.execute(_leased_operation_update(operation_id, now).values(finished_at=now, lease_expires_at=None))
    if result.rowcount != 1:
        return None
    operation = await session.get_one(Operation, operation_id, populate_existing=True)

    # A request can reuse this lease after its handler already skipped an outdated target.
    # Recheck desired state at completion so that request cannot disappear with the lease.
    if operation.kind != OperationKind.solution_deploy:
        return operation

    revision = await session.get(Revision, operation.target_id)
    if revision is None:
        return operation

    solution = await session.get(Solution, revision.solution_id, with_for_update=True)
    if solution is None or solution.deleted_at is not None:
        return operation

    target_id = solution.effective_revision_id
    if target_id is not None and target_id != solution.deployed_revision_id:
        await enqueue(session, kind=OperationKind.solution_deploy, target_id=target_id)

    return operation


async def release(session: AsyncSession, operation_id: UUID) -> Operation | None:
    """Release one interrupted Operation for another worker to resume."""

    # Release only work still owned by this worker.
    now = datetime.now(UTC)
    result = await session.execute(_leased_operation_update(operation_id, now).values(lease_expires_at=None))
    if result.rowcount != 1:
        return None
    return await session.get_one(Operation, operation_id, populate_existing=True)


async def fail(session: AsyncSession, operation_id: UUID, reason: str) -> Operation | None:
    """Fail one leased Operation."""

    # Mark only an unfinished Operation that remains leased terminal.
    now = datetime.now(UTC)
    result = await session.execute(
        _leased_operation_update(operation_id, now).values(
            failed=(reason.strip() or "Operation failed")[:500],
            finished_at=now,
            lease_expires_at=None,
        )
    )
    if result.rowcount != 1:
        return None
    operation = await session.get_one(Operation, operation_id, populate_existing=True)

    # Expose failed creation on its target without changing deletion lifecycle state.
    model = {
        OperationKind.organization_create: Organization,
    }.get(operation.kind)
    if model is not None:
        await session.execute(
            update(model).where(col(model.id) == operation.target_id, col(model.status) == Status.creating).values(status=Status.failed)
        )

    # Persist recovery alongside failure, including timeout failures from jobs.execute.
    # A failed restoration remains failed and never recursively schedules itself.
    if operation.kind != OperationKind.solution_deploy:
        return operation

    revision = await session.get(Revision, operation.target_id)
    if revision is None:
        return operation
    if revision.deployed_at is None:
        revision.failed = True

    solution = await session.get(Solution, revision.solution_id, with_for_update=True)
    if solution is None or solution.deleted_at is not None:
        return operation

    solution.status = Status.failed
    if revision.deployed_at is None and solution.deployed_revision_id is not None:
        await enqueue(session, kind=OperationKind.solution_deploy, target_id=solution.deployed_revision_id)

    return operation
