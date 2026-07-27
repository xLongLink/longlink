from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import text, select, update
from src.logger import logger
from src.environments import env
from packaging.version import Version
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch() -> list[Operation]:
    """Return all operations ordered by newest first."""

    # Read operations through a managed database session.
    async with session_scope() as session:
        statement = select(Operation).order_by(Operation.created_at.desc())
        return list(await session.scalars(statement))


async def fail_in_session(session: AsyncSession, operation: Operation, finished_at: datetime) -> None:
    """Atomically fail one Operation and its active creation or reconciliation target."""

    # Make the leased Operation terminal before applying its resource lifecycle consequence.
    operation.failed = True
    operation.finished_at = finished_at
    operation.lease_expires_at = None

    # Compute reconciliation failures affect only targets that remain registered.
    if operation.kind == OperationKind.compute_reconcile:
        await session.execute(
            update(ComputeRegistry)
            .where(ComputeRegistry.id == operation.target_id)
            .values(status=Status.failed)
        )
        return

    # Application creation failures affect only active, non-tombstoned Applications.
    if operation.kind == OperationKind.application_create:
        await session.execute(
            update(Application)
            .where(
                Application.id == operation.target_id,
                Application.deleted_at.is_(None),
                Application.status != Status.deleting,
            )
            .values(status=Status.failed)
        )
        return

    # Organization creation and reconciliation share one guarded terminal transition.
    if operation.kind in {OperationKind.organization_create, OperationKind.organization_reconcile}:
        await session.execute(
            update(Organization)
            .where(
                Organization.id == operation.target_id,
                Organization.deleted_at.is_(None),
                Organization.status != Status.deleting,
            )
            .values(status=Status.failed)
        )
        return

    # Deletion Operations intentionally retain their target's deleting state.
    return


async def enqueue_in_session(
    session: AsyncSession,
    compute_id: UUID,
    locked_compute: ComputeRegistry | None = None,
    *,
    kind: OperationKind = OperationKind.compute_reconcile,
    target_id: UUID | None = None,
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
        compute = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        if compute is None:
            raise ValueError("Operation compute registry not found")

    # Select the newest release observed for this target and its compute aggregate.
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
    platform_version = max(
        [env.VERSION, *versions, *([compute.version] if compute.version is not None else [])],
        key=Version,
    )

    # Reuse queued work without locking an active Operation behind its compute aggregate.
    existing = (
        await session.scalars(
            select(Operation)
            .where(
                Operation.kind == kind,
                Operation.target_id == target,
                Operation.finished_at.is_(None),
                Operation.lease_expires_at.is_(None),
            )
            .order_by(Operation.created_at)
            .with_for_update()
        )
    ).all()
    current_version = Version(platform_version)
    queued = next(
        (item for item in existing if Version(item.platform_version) == current_version),
        None,
    )
    if queued is not None:
        return queued

    # Active work is immutable and receives a separate follow-up without losing its worker lock.
    now = utcnow()
    operation = Operation(
        kind=kind,
        target_id=target,
        platform_version=platform_version,
        available_at=now + timedelta(seconds=max(0, delay_seconds)),
    )
    session.add(operation)
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

    # Preserve terminal and lease state while advancing only the availability timestamp.
    async with session_scope() as session:
        operation = await session.scalar(
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.finished_at.is_(None),
            )
            .values(available_at=utcnow())
            .returning(Operation)
        )
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
                await session.scalar(select(ComputeRegistry.id).order_by(ComputeRegistry.id).limit(1).with_for_update())

            # Refuse a new claim while another Operation retains an active lease.
            active = await session.scalar(
                select(Operation.id)
                .where(
                    Operation.finished_at.is_(None),
                    Operation.lease_expires_at > now,
                )
                .limit(1)
            )
            if active is not None:
                return None

            # A lost worker makes its one claimed Operation terminal instead of releasing it for another execution.
            expired = await session.scalar(
                select(Operation)
                .where(
                    Operation.finished_at.is_(None),
                    Operation.lease_expires_at.is_not(None),
                    Operation.lease_expires_at <= now,
                )
                .order_by(Operation.created_at.asc(), Operation.id.asc())
                .limit(1)
                .with_for_update()
            )
            if expired is not None:
                logger.error("Operation %s failed after its worker lease expired", expired.id)
                await fail_in_session(session, expired, now)
                await session.commit()
                continue

            # Concurrent claimers contend for the same deterministic oldest unclaimed row.
            operation = await session.scalar(
                select(Operation)
                .where(
                    Operation.finished_at.is_(None),
                    Operation.platform_version == env.VERSION,
                    Operation.available_at <= now,
                    Operation.lease_expires_at.is_(None),
                )
                .order_by(Operation.created_at.asc(), Operation.id.asc())
                .limit(1)
                .with_for_update()
            )
            if operation is None:
                return None

            # Keep the crash-recovery lock beyond the bounded handler execution.
            operation.lease_expires_at = now + timedelta(minutes=30)
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
    """Fail and unlock one operation while the caller owns its unexpired lease."""

    # Lock only the currently leased Operation before failing it and its lifecycle target atomically.
    async with session_scope() as session:
        now = utcnow()
        operation = await session.scalar(
            select(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_expires_at > now,
                Operation.finished_at.is_(None),
            )
            .with_for_update()
        )

        # A missing row means the worker no longer holds this Operation's lease.
        if operation is None:
            return None

        # Persist one transaction containing both terminal states.
        await fail_in_session(session, operation, now)
        await session.commit()
        return operation
