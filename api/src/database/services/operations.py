from uuid import UUID
from datetime import timedelta
from sqlalchemy import or_, select, update
from src.logger import logger
from src.environments import env
from packaging.version import Version
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.models.operations import OperationKind, ReconciliationScope
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation

OPERATION_LEASE_SECONDS = 120
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
    scope: ReconciliationScope,
    locked_compute: ComputeRegistry | None = None,
    *,
    kind: OperationKind = OperationKind.compute,
    target_id: UUID | None = None,
    desired_change: bool = True,
    application_ids: set[UUID] | None = None,
) -> Operation:
    """Coalesce scoped Platform reconciliation inside the caller's desired-state transaction.

    Compute locking keeps the release target monotonic and queueing atomic across LongLink Platform replicas. Callers
    that already locked the compute in this transaction can supply it to avoid selecting the same row again.
    """

    # Resolve and validate the registered resource target before queueing work.
    target = target_id or compute_id
    if kind == OperationKind.compute and target != compute_id:
        raise ValueError("Compute operations must target their compute registry")
    if kind != OperationKind.compute and target_id is None:
        raise ValueError("Migration operations require an explicit resource target")
    if kind != OperationKind.compute and scope != ReconciliationScope.platform:
        raise ValueError("Migration operations require Platform reconciliation scope")

    # Platform work cannot target Applications, and an explicit target set must contain work.
    if scope == ReconciliationScope.platform and application_ids is not None:
        raise ValueError("Platform reconciliation cannot target Applications")
    if application_ids is not None and not application_ids:
        raise ValueError("Application reconciliation targets cannot be empty")
    requested_ids: list[str] | None = (
        sorted(str(application_id) for application_id in application_ids) if application_ids is not None else None
    )

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
                .where(Operation.kind == kind, Operation.target_id == target)
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
    existing = (
        await session.execute(
            select(Operation)
            .where(
                Operation.kind == kind,
                Operation.target_id == target,
                Operation.stopped_at.is_(None),
            )
            .with_for_update()
        )
    ).scalar_one_or_none()

    # Application reconciliation dominates Platform work; complete work dominates and targeted work is unioned.
    effective_scope = scope
    effective_application_ids: list[str] | None = requested_ids
    if existing is not None and (
        existing.scope == ReconciliationScope.application or scope == ReconciliationScope.application
    ):
        effective_scope = ReconciliationScope.application
        if (existing.scope == ReconciliationScope.application and existing.application_ids is None) or (
            scope == ReconciliationScope.application and requested_ids is None
        ):
            effective_application_ids = None
        else:
            effective_application_ids = sorted(set(existing.application_ids or []) | set(requested_ids or []))

    # Desired-state changes and release upgrades supersede active attempts and remove inherited retry delays.
    if existing is not None:
        version_changed = Version(platform_version) > Version(existing.platform_version)
        work_changed = existing.scope != effective_scope or existing.application_ids != effective_application_ids
        if not desired_change and not version_changed and not work_changed:
            return existing
        now = utcnow()

        # A fresh desired target receives a complete attempt budget after the previous row exhausted its own.
        if existing.attempt_count >= OPERATION_ATTEMPT_LIMIT:
            logger.error("Operation %s was superseded after exhausting its attempt budget", existing.id)
            existing.failed = True
            existing.stopped_at = now
            existing.lease_expires_at = None
        else:
            existing.scope = effective_scope
            existing.application_ids = effective_application_ids
            if version_changed:
                existing.platform_version = platform_version
            existing.scheduled_at = now
            if existing.lease_expires_at is not None:
                existing.lease_expires_at = now
            return existing

    # New work starts ready for the Platform release that owns the compute target.
    operation = Operation(
        kind=kind,
        scope=effective_scope,
        target_id=target,
        application_ids=effective_application_ids,
        platform_version=platform_version,
        compute_id=compute_id,
        scheduled_at=utcnow(),
    )
    session.add(operation)
    await session.flush()
    return operation


async def enqueue(
    compute_id: UUID,
    scope: ReconciliationScope = ReconciliationScope.application,
    *,
    kind: OperationKind = OperationKind.compute,
    target_id: UUID | None = None,
    application_ids: set[UUID] | None = None,
) -> Operation:
    """Queue one registered Platform operation in a dedicated transaction."""

    # Convenience callers use the same transactional enqueue implementation as domain services.
    async with session_scope() as session:
        operation = await enqueue_in_session(
            session,
            compute_id,
            scope,
            kind=kind,
            target_id=target_id,
            application_ids=application_ids,
        )
        await session.commit()
        return operation


async def claim_next() -> Operation | None:
    """Claim the oldest due Operation targeting this LongLink Platform release and start its next fenced lease.

    Compute locking serializes related resource handlers across replicas, stale leases are reclaimable, and exhausted work
    becomes terminal.
    """

    # Skip computes with active work while selecting the oldest due candidate without reversing aggregate lock order.
    while True:
        async with session_scope() as session:
            now = utcnow()
            active_compute_ids = select(Operation.compute_id).where(
                Operation.stopped_at.is_(None),
                Operation.started_at.is_not(None),
                Operation.lease_expires_at > now,
            )
            candidate = (
                await session.execute(
                    select(Operation.id, Operation.compute_id)
                    .where(
                        Operation.stopped_at.is_(None),
                        Operation.platform_version == env.VERSION,
                        Operation.scheduled_at <= now,
                        or_(Operation.lease_expires_at.is_(None), Operation.lease_expires_at <= now),
                        Operation.compute_id.not_in(active_compute_ids),
                    )
                    .order_by(Operation.created_at.asc())
                    .limit(1)
                )
            ).first()

            # Return nothing when no operation is ready to run.
            if candidate is None:
                return None
            operation_id, compute_id = candidate

            # Follow the aggregate-first lock order used by desired-state mutations and completion.
            compute = (
                await session.execute(select(ComputeRegistry.id).where(ComputeRegistry.id == compute_id).with_for_update())
            ).scalar_one_or_none()
            if compute is None:
                return None
            operation = (
                await session.execute(
                    select(Operation)
                    .where(
                        Operation.id == operation_id,
                        Operation.stopped_at.is_(None),
                        Operation.platform_version == env.VERSION,
                        Operation.scheduled_at <= now,
                        or_(Operation.lease_expires_at.is_(None), Operation.lease_expires_at <= now),
                    )
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if operation is None:
                continue

            # Another claimant may have activated related work before this transaction acquired the compute lock.
            active_operation = (
                await session.execute(
                    select(Operation.id)
                    .where(
                        Operation.compute_id == compute_id,
                        Operation.id != operation.id,
                        Operation.stopped_at.is_(None),
                        Operation.started_at.is_not(None),
                        Operation.lease_expires_at > now,
                    )
                    .limit(1)
                )
            ).scalar_one_or_none()
            if active_operation is not None:
                continue

            # A worker that crashed on its final attempt leaves terminal failure for the next claimant to record.
            if operation.attempt_count >= OPERATION_ATTEMPT_LIMIT:
                logger.error("Operation %s failed after reaching the attempt limit", operation.id)
                operation.failed = True
                operation.stopped_at = now
                operation.lease_expires_at = None
                await session.commit()
                continue

            # Claim the next generation and begin its renewable lease.
            operation.started_at = now
            operation.attempt_count += 1
            operation.lease_expires_at = now + timedelta(seconds=OPERATION_LEASE_SECONDS)
            await session.commit()
            return operation


async def renew_lease(operation_id: UUID, attempt_count: int) -> bool:
    """Extend a matching operation lease only while it remains unexpired."""

    # Include the current attempt in the ownership check so expired workers cannot revive their lease.
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
            .values(lease_expires_at=now + timedelta(seconds=OPERATION_LEASE_SECONDS))
        )
        result = await session.execute(statement)

        # A non-matching update means the caller has lost exclusive ownership.
        if result.rowcount == 0:
            return False

        await session.commit()
        return True


async def complete(operation_id: UUID, attempt_count: int) -> Operation | None:
    """Complete one operation while the caller owns its current attempt."""

    # Resolve the compute target before locking in the same aggregate-first order used by desired-state mutations.
    async with session_scope() as session:
        snapshot = (await session.execute(select(Operation).where(Operation.id == operation_id))).scalar_one_or_none()
        if snapshot is None:
            return None
        compute = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == snapshot.compute_id).with_for_update())
        ).scalar_one_or_none()
        if compute is None:
            return None

        # Lock and revalidate the leased operation after the compute prevents concurrent desired-state changes.
        now = utcnow()
        operation = (
            await session.execute(
                select(Operation)
                .where(
                    Operation.id == operation_id,
                    Operation.attempt_count == attempt_count,
                    Operation.lease_expires_at > now,
                    Operation.started_at.is_not(None),
                    Operation.stopped_at.is_(None),
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
        if operation is None:
            return None

        # Terminal completion releases the lease while preserving the final attempt timestamps.
        operation.stopped_at = now
        operation.lease_expires_at = None

        await session.commit()
        return operation


async def lease_is_current(operation_id: UUID, attempt_count: int) -> bool:
    """Return whether one worker still owns an unexpired operation lease."""

    # External mutation phases call this fence after awaits and before issuing provider writes.
    async with session_scope() as session:
        now = utcnow()
        statement = select(Operation.id).where(
            Operation.id == operation_id,
            Operation.attempt_count == attempt_count,
            Operation.lease_expires_at > now,
            Operation.started_at.is_not(None),
            Operation.stopped_at.is_(None),
        )
        return (await session.execute(statement)).scalar_one_or_none() is not None


async def defer(
    operation_id: UUID,
    attempt_count: int,
    delay_seconds: float,
) -> Operation | None:
    """Release an unexpired lease and schedule one transient retry."""

    # Schedule the next attempt only while this worker still owns the current one.
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

        # A missing returned row means the attempt was superseded or its lease expired.
        if operation is None:
            return None

        await session.commit()
        return operation


async def fail(operation_id: UUID, attempt_count: int) -> Operation | None:
    """Fail an operation while the caller owns its unexpired lease."""

    # Persist terminal failure only for the current leased attempt.
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

        # A missing returned row means the attempt was superseded or its lease expired.
        if operation is None:
            return None

        await session.commit()
        return operation
