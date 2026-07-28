from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import or_, and_, case, text, select, update
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
        compute = await session.get(ComputeRegistry, operation.target_id, with_for_update=True)
        if compute is None:
            return
        if (
            compute.status == Status.running
            and compute.version is not None
            and Version(compute.version) >= Version(operation.platform_version)
        ):
            return
        compute.status = Status.failed
        return

    # Application creation failures affect only active, non-tombstoned Applications.
    if operation.kind == OperationKind.application_create:
        await session.execute(
            update(Application)
            .where(
                Application.id == operation.target_id,
                Application.deleted_at.is_(None),
                Application.status.in_({Status.creating, Status.failed}),
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
                Organization.status.in_({Status.creating, Status.failed}),
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
    latest_version = max(
        Version(version) for version in [env.VERSION, *versions, *([compute.version] if compute.version is not None else [])]
    )
    platform_version = f"v{latest_version}"

    # Reuse queued work without locking an active Operation behind its compute aggregate.
    queued = await session.scalar(
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
        result = await session.execute(
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.finished_at.is_(None),
            )
            .values(available_at=utcnow())
        )
        if result.rowcount != 1:
            return None

        operation = await session.get(Operation, operation_id)
        await session.commit()
        return operation


async def claim_next() -> Operation | None:
    """Lock the oldest due Operation while globally serializing Platform work."""

    # A single active lease prevents conflicting provider and gateway mutations across Platform replicas.
    while True:
        async with session_scope() as session:
            now = utcnow()

            # Use a transaction mutex in PostgreSQL and a registry row lock on other database engines.
            connection = await session.connection()
            if connection.dialect.name == "postgresql":
                await session.execute(text("SELECT pg_advisory_xact_lock(1280263244)"))
            else:
                await session.scalar(select(ComputeRegistry.id).order_by(ComputeRegistry.id).limit(1).with_for_update())

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
                logger.error("Operation %s failed after its worker lease expired", operation.id)
                await fail_in_session(session, operation, now)
                await session.commit()
                continue
            if Version(operation.platform_version) > Version(env.VERSION):
                return None

            # Acquire the lease conditionally because SQLite ignores the row locks above.
            result = await session.execute(
                update(Operation)
                .where(
                    Operation.id == operation.id,
                    Operation.finished_at.is_(None),
                    Operation.lease_expires_at.is_(None),
                    Operation.available_at <= now,
                )
                .values(lease_expires_at=now + timedelta(minutes=30))
            )
            if result.rowcount != 1:
                await session.rollback()
                continue
            await session.refresh(operation)
            await session.commit()
            return operation


async def complete(operation_id: UUID) -> Operation | None:
    """Complete one operation while the caller owns its unexpired lease."""

    # Complete only the currently leased operation.
    async with session_scope() as session:
        now = utcnow()
        result = await session.execute(
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_expires_at > now,
                Operation.finished_at.is_(None),
            )
            .values(finished_at=now, lease_expires_at=None)
        )
        if result.rowcount != 1:
            return None

        operation = await session.get(Operation, operation_id)
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
