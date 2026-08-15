from uuid import UUID
from datetime import timedelta
from sqlmodel import col
from sqlalchemy import case, select, update
from src.logger import logger
from collections.abc import Sequence
from longlink.utils.time import utcnow
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession) -> Sequence[Operation]:
    """Return all operations ordered by newest first."""

    result = await session.scalars(select(Operation).order_by(Operation.created_at.desc()))
    return result.all()


async def discover(session: AsyncSession) -> list[tuple[OperationKind, UUID, UUID]]:
    """Discover release reconciliation targets in dependency order."""

    # Reconcile every present resource and clean up every tombstone.
    result = await session.execute(select(col(ComputeRegistry.id)).order_by(col(ComputeRegistry.id)))
    compute_ids = result.scalars().all()
    result = await session.execute(
        select(col(Organization.id), col(Organization.deleted_at).is_not(None), col(Organization.compute_id)).order_by(
            col(Organization.compute_id), col(Organization.id)
        )
    )
    organization_rows = result.all()
    result = await session.execute(
        select(col(Application.id), col(Application.deleted_at).is_not(None), col(Organization.compute_id))
        .join(Organization, col(Organization.id) == col(Application.organization_id))
        .where(col(Organization.deleted_at).is_(None))
        .order_by(col(Organization.compute_id), col(Application.id))
    )
    application_rows = result.all()

    targets = [(OperationKind.compute_create, compute_id, compute_id) for compute_id in compute_ids]
    targets.extend(
        (
            OperationKind.organization_delete if deleted else OperationKind.organization_create,
            organization_id,
            compute_id,
        )
        for organization_id, deleted, compute_id in organization_rows
    )
    targets.extend(
        (OperationKind.application_delete if deleted else OperationKind.application_create, application_id, compute_id)
        for application_id, deleted, compute_id in application_rows
    )
    return targets


async def enqueue(
    session: AsyncSession,
    compute_id: UUID,
    *,
    kind: OperationKind,
    target_id: UUID,
) -> Operation | None:
    """Add one Platform operation to an existing command transaction."""

    if kind == OperationKind.compute_create and target_id != compute_id:
        raise ValueError("Compute operations must target their compute registry")

    # Require the assigned compute before scheduling its resource work.
    compute_result = await session.scalar(select(ComputeRegistry.id).where(ComputeRegistry.id == compute_id).with_for_update())
    if compute_result is None:
        return None

    # Reuse unleased work and preserve active work as an immutable retry boundary.
    operation = await session.scalar(
        select(Operation)
        .where(
            Operation.kind == kind,
            Operation.target_id == target_id,
            Operation.finished_at.is_(None),
            Operation.lease_expires_at.is_(None),
        )
        .with_for_update()
    )
    if operation is None:
        operation = Operation(
            kind=kind,
            target_id=target_id,
        )
        session.add(operation)
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
    if operation.lease_expires_at is not None:
        logger.error("Operation %s failed after its worker lease expired", operation.id)
        await fail(session, operation.id)
        return None

    # Acquire the lease conditionally because SQLite ignores the row locks above.
    result = await session.execute(
        update(Operation)
        .where(
            Operation.id == operation.id,
            Operation.finished_at.is_(None),
            Operation.lease_expires_at.is_(None),
        )
        .values(lease_expires_at=now + timedelta(minutes=30))
    )
    if result.rowcount != 1:
        return None
    return operation


async def complete(session: AsyncSession, operation_id: UUID) -> Operation | None:
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
        .values(finished_at=now, lease_expires_at=None)
        .returning(Operation)
    )


async def fail(session: AsyncSession, operation_id: UUID) -> Operation | None:
    """Fail one leased Operation."""

    # Mark only an unfinished Operation that remains leased terminal.
    return await session.scalar(
        update(Operation)
        .where(
            Operation.id == operation_id,
            Operation.lease_expires_at.is_not(None),
            Operation.finished_at.is_(None),
        )
        .values(failed=True, finished_at=utcnow(), lease_expires_at=None)
        .returning(Operation)
    )
