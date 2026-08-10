from uuid import UUID
from datetime import timedelta
from sqlalchemy import case, select, update
from src.errors import NotFoundError
from src.logger import logger
from collections.abc import Sequence
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
        return (await session.scalars(select(Operation).order_by(Operation.created_at.desc()))).all()


async def enqueue(
    session: AsyncSession,
    compute_id: UUID,
    *,
    kind: OperationKind,
    target_id: UUID,
) -> Operation:
    """Add one Platform operation to an existing command transaction."""

    if kind == OperationKind.compute_create and target_id != compute_id:
        raise ValueError("Compute operations must target their compute registry")

    # Require the assigned compute before scheduling its resource work.
    compute = await session.get(ComputeRegistry, compute_id, with_for_update=True)
    if compute is None:
        raise NotFoundError("Operation compute registry not found")

    # Reuse unleased work and preserve active work as an immutable retry boundary.
    operation = await session.scalar(
        select(Operation)
        .where(
            Operation.kind == kind,
            Operation.target_id == target_id,
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
            target_id=target_id,
        )
        session.add(operation)
    return operation


async def claim() -> Operation | None:
    """Claim the next unfinished Operation."""

    # A single active lease prevents conflicting provider and gateway mutations across Platform replicas.
    while True:
        async with session_scope() as session:
            now = utcnow()

            # Classify the active lease, expired lease, or next Operation in one locked query.
            operation = await session.scalar(
                select(Operation)
                .where(Operation.finished_at.is_(None))
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
            if operation is None or (operation.lease_expires_at is not None and operation.lease_expires_at > now):
                return None
            if operation.lease_expires_at is not None:
                operation_id = operation.id
                logger.error("Operation %s failed after its worker lease expired", operation_id)
                await session.rollback()
                await fail(operation_id)
                continue
            # Acquire the lease conditionally because SQLite ignores the row locks above.
            if (
                await session.execute(
                    update(Operation)
                    .where(
                        Operation.id == operation.id,
                        Operation.finished_at.is_(None),
                        Operation.lease_expires_at.is_(None),
                    )
                    .values(lease_expires_at=now + timedelta(minutes=30))
                )
            ).rowcount != 1:
                continue
            await session.commit()
            return operation


async def complete(operation_id: UUID) -> Operation | None:
    """Complete one operation while the caller owns its unexpired lease."""

    # Complete only the currently leased operation.
    async with session_scope() as session:
        now = utcnow()
        operation = await session.scalar(
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_expires_at > now,
                Operation.finished_at.is_(None),
            )
            .values(finished_at=now, lease_expires_at=None)
            .returning(Operation)
        )
        if operation is None:
            return None

        await session.commit()
        return operation


async def fail(operation_id: UUID) -> Operation | None:
    """Fail one leased Operation."""

    # Mark only an unfinished Operation that remains leased terminal.
    async with session_scope() as session:
        operation = await session.scalar(
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_expires_at.is_not(None),
                Operation.finished_at.is_(None),
            )
            .values(failed=True, finished_at=utcnow(), lease_expires_at=None)
            .returning(Operation)
        )

        # A missing row means the Operation is no longer leased.
        if operation is None:
            return None

        await session.commit()
        return operation
