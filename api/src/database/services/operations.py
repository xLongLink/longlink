from uuid import UUID
from datetime import timedelta
from sqlalchemy import or_, and_, case, select, update
from src.logger import logger
from collections.abc import Sequence
from src.environments import env
from packaging.version import Version
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


async def fetch() -> Sequence[Operation]:
    """Return all operations ordered by newest first."""

    # Read operations through a managed database session.
    async with session_scope() as session:
        statement = select(Operation).order_by(Operation.created_at.desc())
        return (await session.scalars(statement)).all()


async def create(
    compute_id: UUID,
    *,
    kind: OperationKind = OperationKind.compute_reconcile,
    target_id: UUID | None = None,
    delay_seconds: float = 0,
) -> Operation:
    """Create one registered Platform operation in a dedicated transaction."""

    # Commit independently for simple callers that do not compose a larger command.
    async with session_scope() as session:
        operation = await enqueue(session, compute_id, kind=kind, target_id=target_id, delay_seconds=delay_seconds)
        await session.commit()
        return operation


async def enqueue(
    session: AsyncSession,
    compute_id: UUID,
    *,
    kind: OperationKind = OperationKind.compute_reconcile,
    target_id: UUID | None = None,
    delay_seconds: float = 0,
) -> Operation:
    """Add one Platform operation to an existing command transaction."""

    target = compute_id if target_id is None else target_id
    if kind == OperationKind.compute_reconcile and target != compute_id:
        raise ValueError("Compute operations must target their compute registry")
    if kind != OperationKind.compute_reconcile and target_id is None:
        raise ValueError("Resource operations require an explicit target")

    # Lock the compute before resolving its current release target.
    compute = await session.get(ComputeRegistry, compute_id, with_for_update=True)
    if compute is None:
        raise ValueError("Operation compute registry not found")
    versions = (
        await session.scalars(
            select(Operation.platform_version)
            .where(
                Operation.kind == kind,
                Operation.target_id == target,
            )
            .distinct()
        )
    ).all()
    latest_version = max(
        Version(version) for version in [env.VERSION, *versions, *([compute.version] if compute.version is not None else [])]
    )
    platform_version = f"v{latest_version}"

    # Reuse scheduled work and preserve active work as an immutable retry boundary.
    operation = await session.scalar(
        select(Operation)
        .where(
            Operation.kind == kind,
            Operation.target_id == target,
            Operation.platform_version == platform_version,
            Operation.finished_at.is_(None),
            Operation.lease_expires_at.is_(None),
        )
        .order_by(Operation.created_at, Operation.id)
        .limit(1)
        .with_for_update()
    )
    if operation is None:
        operation = Operation(
            kind=kind,
            target_id=target,
            platform_version=platform_version,
            available_at=utcnow() + timedelta(seconds=max(0, delay_seconds)),
        )
        session.add(operation)
    return operation


async def schedule_now(operation_id: UUID) -> bool:
    """Make one open delayed Operation immediately eligible for claiming."""

    # Preserve terminal and lease state while advancing only the availability timestamp.
    async with session_scope() as session:
        if (
            await session.execute(
                update(Operation)
                .where(
                    Operation.id == operation_id,
                    Operation.finished_at.is_(None),
                )
                .values(available_at=utcnow())
            )
        ).rowcount != 1:
            return False

        await session.commit()
        return True


async def claim() -> Operation | None:
    """Claim the next eligible Operation."""

    # A single active lease prevents conflicting provider and gateway mutations across Platform replicas.
    while True:
        async with session_scope() as session:
            now = utcnow()

            # Classify the active lease, expired lease, or next due Operation in one locked query.
            operation = await session.scalar(
                select(Operation)
                .where(
                    Operation.finished_at.is_(None),
                    or_(
                        Operation.lease_expires_at.is_not(None),
                        and_(
                            Operation.lease_expires_at.is_(None),
                            Operation.available_at <= now,
                        ),
                    ),
                )
                .order_by(
                    case(
                        (Operation.lease_expires_at > now, 0),
                        (Operation.lease_expires_at.is_not(None), 1),
                        else_=2,
                    ),
                    Operation.created_at.asc(),
                    Operation.id.asc(),
                )
                .limit(1)
                .with_for_update()
            )
            if operation is None:
                return None
            if operation.lease_expires_at is not None and operation.lease_expires_at > now:
                return None
            if operation.lease_expires_at is not None:
                operation_id = operation.id
                logger.error("Operation %s failed after its worker lease expired", operation_id)
                await session.rollback()
                await fail(operation_id)
                continue
            if Version(operation.platform_version) > Version(env.VERSION):
                return None

            # Acquire the lease conditionally because SQLite ignores the row locks above.
            if (
                await session.execute(
                    update(Operation)
                    .where(
                        Operation.id == operation.id,
                        Operation.finished_at.is_(None),
                        Operation.lease_expires_at.is_(None),
                        Operation.available_at <= now,
                    )
                    .values(lease_expires_at=now + timedelta(minutes=30))
                )
            ).rowcount != 1:
                await session.rollback()
                continue
            await session.commit()
            return operation


async def complete(operation_id: UUID) -> Operation | None:
    """Complete one operation while the caller owns its unexpired lease."""

    # Complete only the currently leased operation.
    async with session_scope() as session:
        now = utcnow()
        if (
            await session.execute(
                update(Operation)
                .where(
                    Operation.id == operation_id,
                    Operation.lease_expires_at > now,
                    Operation.finished_at.is_(None),
                )
                .values(finished_at=now, lease_expires_at=None)
            )
        ).rowcount != 1:
            return None

        operation = await session.get(Operation, operation_id)
        await session.commit()
        return operation


async def fail(operation_id: UUID) -> Operation | None:
    """Fail one leased Operation."""

    # Lock the leased Operation before marking it terminal.
    async with session_scope() as session:
        operation = await session.scalar(
            select(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_expires_at.is_not(None),
                Operation.finished_at.is_(None),
            )
            .with_for_update()
        )

        # A missing row means the Operation is no longer leased.
        if operation is None:
            return None

        # Mark the leased Operation terminal.
        operation.failed = True
        operation.finished_at = utcnow()
        operation.lease_expires_at = None
        await session.commit()
        return operation
