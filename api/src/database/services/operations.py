from uuid import UUID
from datetime import timedelta
from sqlalchemy import or_, text, select, update
from src.logger import logger
from src.environments import env
from packaging.version import Version
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation

OPERATION_ATTEMPT_LIMIT = 6


async def fetch() -> list[Operation]:
    """Return all operations ordered by newest first."""

    # Read operations through a managed database session.
    async with session_scope() as session:
        statement = select(Operation).order_by(Operation.created_at.desc())
        result = await session.execute(statement)
        return result.scalars().all()


async def enqueue_in_session(
    session: AsyncSession,
    compute_id: UUID,
    locked_compute: ComputeRegistry | None = None,
    *,
    kind: OperationKind = OperationKind.compute_reconcile,
    target_id: UUID | None = None,
    fresh: bool = False,
    delay_seconds: float = 0,
) -> Operation:
    """Append one typed Platform operation inside the caller's state transaction.

    Compute locking keeps the release target monotonic and queueing atomic across LongLink Platform replicas. Callers
    that already locked the compute in this transaction can supply it to avoid selecting the same row again.
    """

    # Resolve and validate the registered resource target before queueing work.
    target = target_id or compute_id
    if kind == OperationKind.compute_reconcile and target != compute_id:
        raise ValueError("Compute operations must target their compute registry")
    if kind != OperationKind.compute_reconcile and target_id is None:
        raise ValueError("Resource operations require an explicit target")

    # Reuse a caller-owned aggregate lock when available.
    compute = locked_compute
    if compute is not None and compute.id != compute_id:
        raise ValueError("Locked compute registry does not match operation compute")

    # Otherwise serialize queue changes through the aggregate across Platform replicas.
    if compute is None:
        compute = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update())
        ).scalar_one_or_none()
        if compute is None:
            raise ValueError("Operation compute registry not found")
    versions = (
        (
            await session.execute(
                select(Operation.platform_version)
                .where(
                    Operation.kind == kind,
                    Operation.target_id == target,
                )
                .distinct()
            )
        )
        .scalars()
        .all()
    )
    platform_version = max(
        [env.VERSION, *versions, *([compute.version] if compute.version is not None else [])],
        key=Version,
    )

    # Reuse queued work and lock every matching open row before deciding whether a follow-up is required.
    existing = (
        (
            await session.execute(
                select(Operation)
                .where(
                    Operation.kind == kind,
                    Operation.target_id == target,
                    Operation.stopped_at.is_(None),
                )
                .order_by(Operation.created_at)
                .with_for_update()
            )
        )
        .scalars()
        .all()
    )
    current_version = Version(platform_version)
    queued = next(
        (item for item in existing if item.started_at is None and Version(item.platform_version) == current_version),
        None,
    )
    if queued is not None and (not fresh or queued.attempt_count == 0):
        return queued

    # Active work is immutable and receives a separate follow-up without losing its worker lock.
    now = utcnow()
    operation = Operation(
        kind=kind,
        target_id=target,
        platform_version=platform_version,
        scheduled_at=now + timedelta(seconds=max(0, delay_seconds)),
    )
    session.add(operation)
    await session.flush()
    return operation


async def enqueue(compute_id: UUID, *, kind: OperationKind = OperationKind.compute_reconcile, target_id: UUID | None = None) -> Operation:
    """Queue one registered Platform operation in a dedicated transaction."""

    # Convenience callers use the same transactional enqueue implementation as domain services.
    async with session_scope() as session:
        operation = await enqueue_in_session(
            session,
            compute_id,
            kind=kind,
            target_id=target_id,
        )
        await session.commit()
        return operation


async def schedule_now(operation_id: UUID) -> Operation | None:
    """Make one open delayed Operation immediately eligible for claiming."""

    # Preserve terminal and lease state while advancing only the due timestamp.
    async with session_scope() as session:
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.stopped_at.is_(None),
            )
            .values(scheduled_at=utcnow())
            .returning(Operation)
        )
        operation = (await session.execute(statement)).scalar_one_or_none()
        if operation is None:
            return None

        await session.commit()
        return operation


async def claim_next() -> Operation | None:
    """Lock the oldest due Operation while globally serializing Platform work."""

    # A single active lease prevents conflicting provider and gateway mutations across Platform replicas.
    while True:
        async with session_scope() as session:
            now = utcnow()

            # Use an immutable transaction mutex in PostgreSQL; local SQLite runs one scheduler process.
            connection = await session.connection()
            if connection.dialect.name == "postgresql":
                await session.execute(text("SELECT pg_advisory_xact_lock(1280263244)"))
            else:
                queue_lock = (
                    await session.execute(select(ComputeRegistry.id).order_by(ComputeRegistry.id).limit(1).with_for_update())
                ).scalar_one_or_none()
                if queue_lock is None:
                    return None

            active = (
                await session.execute(
                    select(Operation.id)
                    .where(
                        Operation.stopped_at.is_(None),
                        Operation.started_at.is_not(None),
                        Operation.lease_expires_at > now,
                    )
                    .limit(1)
                )
            ).scalar_one_or_none()
            if active is not None:
                return None

            # Concurrent claimers contend for the same deterministic oldest due row.
            operation = (
                await session.execute(
                    select(Operation)
                    .where(
                        Operation.stopped_at.is_(None),
                        Operation.platform_version == env.VERSION,
                        Operation.scheduled_at <= now,
                        or_(Operation.lease_expires_at.is_(None), Operation.lease_expires_at <= now),
                    )
                    .order_by(Operation.created_at.asc(), Operation.id.asc())
                    .limit(1)
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if operation is None:
                return None

            # Recheck after candidate contention in case an external writer activated different work.
            active_operation = (
                await session.execute(
                    select(Operation.id)
                    .where(
                        Operation.id != operation.id,
                        Operation.stopped_at.is_(None),
                        Operation.started_at.is_not(None),
                        Operation.lease_expires_at > now,
                    )
                    .limit(1)
                )
            ).scalar_one_or_none()
            if active_operation is not None:
                return None

            # A worker that crashed on its final attempt leaves terminal failure for the next claimant to record.
            if operation.attempt_count >= OPERATION_ATTEMPT_LIMIT:
                logger.error("Operation %s failed after reaching the attempt limit", operation.id)
                operation.failed = True
                operation.stopped_at = now
                operation.lease_expires_at = None
                await session.commit()
                continue

            # Keep the crash-recovery lock beyond the bounded handler execution.
            operation.started_at = now
            operation.attempt_count += 1
            operation.lease_expires_at = now + timedelta(minutes=30)
            await session.commit()
            return operation


async def complete(operation_id: UUID, attempt_count: int) -> Operation | None:
    """Complete one operation while the caller owns its current attempt."""

    # Complete only the currently locked attempt.
    async with session_scope() as session:
        now = utcnow()
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.attempt_count == attempt_count,
                Operation.lease_expires_at > now,
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
            )
            .values(stopped_at=now, lease_expires_at=None)
            .returning(Operation)
        )
        operation = (await session.execute(statement)).scalar_one_or_none()
        if operation is None:
            return None

        await session.commit()
        return operation


async def defer(operation_id: UUID, attempt_count: int, delay_seconds: float) -> Operation | None:
    """Unlock one operation and schedule a transient retry."""

    # Schedule the next attempt only while this worker still holds the lock.
    async with session_scope() as session:
        now = utcnow()
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.attempt_count == attempt_count,
                Operation.lease_expires_at > now,
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
            )
            .values(
                started_at=None,
                scheduled_at=now + timedelta(seconds=max(0, delay_seconds)),
                lease_expires_at=None,
            )
            .returning(Operation)
        )
        result = await session.execute(statement)
        operation = result.scalar_one_or_none()

        # A missing row means the worker no longer holds this attempt's lock.
        if operation is None:
            return None

        await session.commit()
        return operation


async def fail(operation_id: UUID, attempt_count: int) -> Operation | None:
    """Fail and unlock one operation while the caller holds its current attempt."""

    # Persist terminal failure only for the current locked attempt.
    async with session_scope() as session:
        now = utcnow()
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.attempt_count == attempt_count,
                Operation.lease_expires_at > now,
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
            )
            .values(
                failed=True,
                stopped_at=now,
                lease_expires_at=None,
            )
            .returning(Operation)
        )
        result = await session.execute(statement)
        operation = result.scalar_one_or_none()

        # A missing row means the worker no longer holds this attempt's lock.
        if operation is None:
            return None

        await session.commit()
        return operation
