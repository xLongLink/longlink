from uuid import UUID
from datetime import timedelta
from sqlmodel import col
from sqlalchemy import String, or_, case, cast, func, select, update
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.models.operations import OperationKind, OperationResource, OperationResponse
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization

OPERATION_LOG_RETENTION = timedelta(days=30)


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
    compute_target_ids = {operation.target_id for operation in operations if operation.kind == OperationKind.compute_create}
    organization_target_ids = {
        operation.target_id
        for operation in operations
        if operation.kind in {OperationKind.organization_create, OperationKind.organization_delete}
    }
    solution_target_ids = {operation.target_id for operation in operations if operation.kind == OperationKind.solution_delete}

    # Load compact resource details for each target type.
    resources: dict[tuple[OperationKind, UUID], OperationResource] = {}
    if compute_target_ids:
        result = await session.execute(
            select(col(ComputeRegistry.id), col(ComputeRegistry.name)).where(col(ComputeRegistry.id).in_(compute_target_ids))
        )
        for resource_id, name in result:
            resources[(OperationKind.compute_create, resource_id)] = OperationResource(id=resource_id, name=name)

    if organization_target_ids:
        result = await session.execute(
            select(col(Organization.id), col(Organization.name)).where(col(Organization.id).in_(organization_target_ids))
        )
        for resource_id, name in result:
            resource = OperationResource(id=resource_id, name=name)
            resources[(OperationKind.organization_create, resource_id)] = resource
            resources[(OperationKind.organization_delete, resource_id)] = resource

    if solution_target_ids:
        result = await session.execute(select(col(Solution.id), col(Solution.name)).where(col(Solution.id).in_(solution_target_ids)))
        for resource_id, name in result:
            resources[(OperationKind.solution_delete, resource_id)] = OperationResource(id=resource_id, name=name)

    revision_ids = {operation.target_id for operation in operations if operation.kind == OperationKind.solution_deploy}
    if revision_ids:
        result = await session.execute(
            select(col(Revision.id), col(Solution.id), col(Solution.name))
            .join(Solution, col(Solution.id) == col(Revision.solution_id))
            .where(col(Revision.id).in_(revision_ids))
        )
        for revision_id, solution_id, name in result:
            resources[(OperationKind.solution_deploy, revision_id)] = OperationResource(id=solution_id, name=name)

    # Assemble response models with their resolved target resource.
    items = [
        OperationResponse(
            id=operation.id,
            kind=operation.kind,
            resource=resources.get((operation.kind, operation.target_id)),
            target_id=operation.target_id,
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


async def clear_expired_logs(session: AsyncSession) -> int:
    """Clear logs from Operations that finished outside the retention window."""

    # Clear non-empty expired payloads without loading retained Operation history.
    result = await session.execute(
        update(Operation)
        .where(
            col(Operation.finished_at) <= utcnow() - OPERATION_LOG_RETENTION,
            cast(col(Operation.logs), String) != "[]",
        )
        .values(logs=[])
    )
    return result.rowcount


async def schedule_reconciliation(session: AsyncSession) -> None:
    """Schedule every release reconciliation target in dependency order."""

    # Reconcile every present resource and clean up every tombstone.
    compute_result = await session.scalars(select(col(ComputeRegistry.id)).order_by(col(ComputeRegistry.id)))
    organization_result = await session.execute(
        select(col(Organization.id), col(Organization.deleted_at).is_not(None)).order_by(col(Organization.compute_id), col(Organization.id))
    )
    solution_result = await session.scalars(
        select(Solution)
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .where(col(Organization.deleted_at).is_(None))
        .order_by(col(Organization.compute_id), col(Solution.id))
    )

    # Create or reuse every desired-state operation in one transaction.
    for compute_id in compute_result:
        await enqueue(session, kind=OperationKind.compute_create, target_id=compute_id)
    for organization_id, deleted in organization_result:
        await enqueue(
            session,
            kind=OperationKind.organization_delete if deleted else OperationKind.organization_create,
            target_id=organization_id,
        )
    for solution in solution_result:
        if solution.deleted_at is not None:
            await enqueue(session, kind=OperationKind.solution_delete, target_id=solution.id)
        else:
            target_id = solution.effective_revision_id
            if target_id is not None:
                await enqueue(session, kind=OperationKind.solution_deploy, target_id=target_id)


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


async def complete(session: AsyncSession, operation_id: UUID, logs: list[str] | None = None) -> Operation | None:
    """Complete one operation while the caller owns its unexpired lease."""

    # Complete only the currently leased operation.
    now = utcnow()
    result = await session.execute(
        update(Operation)
        .where(
            col(Operation.id) == operation_id,
            col(Operation.lease_expires_at) > now,
            col(Operation.finished_at).is_(None),
        )
        .values(finished_at=now, lease_expires_at=None, logs=[] if logs is None else logs)
        .execution_options(synchronize_session=False)
    )
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
    now = utcnow()
    result = await session.execute(
        update(Operation)
        .where(
            col(Operation.id) == operation_id,
            col(Operation.lease_expires_at) > now,
            col(Operation.finished_at).is_(None),
        )
        .values(lease_expires_at=None)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        return None
    return await session.get_one(Operation, operation_id, populate_existing=True)


async def fail(session: AsyncSession, operation_id: UUID, reason: str, logs: list[str] | None = None) -> Operation | None:
    """Fail one leased Operation."""

    # Mark only an unfinished Operation that remains leased terminal.
    now = utcnow()
    result = await session.execute(
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
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        return None
    operation = await session.get_one(Operation, operation_id, populate_existing=True)

    # Expose failed creation work on its target without changing deletion lifecycle state.
    model = {
        OperationKind.compute_create: ComputeRegistry,
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
