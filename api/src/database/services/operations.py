import re
from uuid import UUID
from datetime import timedelta
from sqlalchemy import or_, select, update
from src.version import platform_version_key, latest_platform_version
from src.environments import env
from longlink.utils.time import utcnow
from src.database.session import session_scope
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation

OPERATION_LEASE_SECONDS = 120
OPERATION_ATTEMPT_LIMIT = 6
OPERATION_ERROR_MAX_LENGTH = 2000
OPERATION_ERROR_TRUNCATION_MARKER = "... [truncated]"
URL_CREDENTIAL_PATTERN = re.compile(r"://([^\s/:@]+):([^\s/@]+)@")
AUTHORIZATION_SECRET_PATTERN = re.compile(r"(?i)([\"']?authorization[\"']?\s*[:=]\s*[\"']?(?:bearer\s+)?)[^\s'\",}]+([\"']?)")
ASSIGNED_SECRET_PATTERN = re.compile(
    r"(?i)((?<![a-z0-9_-])[\"']?"
    r"(?:storage_secret_access_key|storage-secret-access-key|storage_access_key_id|storage-access-key-id|"
    r"secret_access_key|secret-access-key|access_key_id|access-key-id|client_key_data|client-key-data|"
    r"client_certificate_data|client-certificate-data|database_password|database-password|database_url|database-url|"
    r"longlink_database_password|longlink-database-password|longlink_storage_password|longlink-storage-password|"
    r"storage_password|storage-password|storage_url|storage-url|"
    r"access_key|access-key|secret_key|secret-key|password|secret|token|dsn)"
    r"[\"']?\s*[:=]\s*[\"']?)[^\s'\",}]+([\"']?)"
)


def sanitize_operation_error(error: str) -> str:
    """Return redacted operation error text that fits the database column."""

    # Operation errors are visible through the API, so redact common credential shapes before persisting.
    redacted_error = URL_CREDENTIAL_PATTERN.sub("://<redacted>:<redacted>@", error)
    redacted_error = AUTHORIZATION_SECRET_PATTERN.sub(r"\1<redacted>\2", redacted_error)
    redacted_error = ASSIGNED_SECRET_PATTERN.sub(r"\1<redacted>\2", redacted_error)

    # Keep short errors unchanged after redaction.
    if len(redacted_error) <= OPERATION_ERROR_MAX_LENGTH:
        return redacted_error

    return redacted_error[: OPERATION_ERROR_MAX_LENGTH - len(OPERATION_ERROR_TRUNCATION_MARKER)] + OPERATION_ERROR_TRUNCATION_MARKER


async def fetch() -> list[Operation]:
    """Return all operations ordered by newest first."""

    # Read operations through a managed database session.
    async with session_scope() as session:
        statement = select(Operation).order_by(Operation.created_at.desc())
        result = await session.execute(statement)
        return result.scalars().all()


async def latest(compute_id: UUID) -> Operation | None:
    """Return the newest reconciliation operation for one compute target."""

    # Mutation services commit their operation atomically before routes load it for the response.
    async with session_scope() as session:
        statement = select(Operation).where(Operation.compute_id == compute_id).order_by(Operation.created_at.desc()).limit(1)
        return (await session.execute(statement)).scalar_one_or_none()


async def reject_platform_downgrade() -> None:
    """Reject an API binary older than any persisted LongLink Platform release target or observation."""

    # Operation history and observed compute targets form the forward-only release watermark.
    async with session_scope() as session:
        compute_versions = (
            (await session.execute(select(ComputeRegistry.version).where(ComputeRegistry.version.is_not(None)).distinct()))
            .scalars()
            .all()
        )
        operation_versions = (await session.execute(select(Operation.platform_version).distinct())).scalars().all()
    versions = [version for version in (*compute_versions, *operation_versions) if version is not None]
    if not versions:
        return
    latest_version = latest_platform_version(*versions)

    # Older binaries cannot claim newer-target Operations, so fail before accepting traffic.
    if platform_version_key(env.VERSION) < platform_version_key(latest_version):
        raise RuntimeError(
            f"LongLink Platform downgrade from {latest_version} to {env.VERSION} is not supported; deploy {latest_version} or newer"
        )


async def enqueue_in_session(
    session: AsyncSession,
    compute_id: UUID,
    desired_change: bool = True,
) -> Operation:
    """Coalesce compute reconciliation inside the caller's desired-state transaction.

    Compute locking keeps the release target monotonic and queueing atomic across LongLink Platform replicas.
    """

    # Serialize queue changes through the aggregate so release targets remain monotonic across Platform replicas.
    compute = (
        await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update())
    ).scalar_one_or_none()
    if compute is None:
        raise ValueError("Operation compute registry not found")
    versions = (
        (await session.execute(select(Operation.platform_version).where(Operation.compute_id == compute_id).distinct()))
        .scalars()
        .all()
    )
    platform_version = latest_platform_version(env.VERSION, *versions, *([compute.version] if compute.version is not None else []))
    existing = (
        await session.execute(
            select(Operation)
            .where(
                Operation.compute_id == compute_id,
                Operation.stopped_at.is_(None),
            )
            .with_for_update()
        )
    ).scalar_one_or_none()

    # Desired changes and release upgrades supersede active attempts and remove inherited retry delays.
    if existing is not None:
        version_changed = platform_version_key(platform_version) > platform_version_key(existing.platform_version)
        if not desired_change and not version_changed:
            return existing
        now = utcnow()

        # A fresh desired target receives a complete attempt budget after the previous row exhausted its own.
        if existing.attempt_count >= OPERATION_ATTEMPT_LIMIT:
            existing.error = "Operation superseded after exhausting its attempt budget"
            existing.stopped_at = now
            existing.lease_expires_at = None
        else:
            if version_changed:
                existing.platform_version = platform_version
            existing.error = None
            existing.scheduled_at = now
            if existing.lease_expires_at is not None:
                existing.lease_expires_at = now
            return existing

    # New work starts ready for the Platform release that owns the compute target.
    operation = Operation(
        platform_version=platform_version,
        compute_id=compute_id,
        scheduled_at=utcnow(),
    )
    session.add(operation)
    await session.flush()
    return operation


async def enqueue(compute_id: UUID, desired_change: bool = True) -> Operation:
    """Queue one compute reconciliation in a dedicated transaction."""

    # Convenience callers use the same transactional enqueue implementation as domain services.
    async with session_scope() as session:
        operation = await enqueue_in_session(session, compute_id, desired_change)
        await session.commit()
        await session.refresh(operation)
        return operation


async def claim_next() -> Operation | None:
    """Claim the oldest due Operation targeting this LongLink Platform release and start its next fenced lease.

    Row locking coordinates replicas, stale leases are reclaimable, and exhausted work becomes terminal.
    """

    # Skip exhausted crash recovery rows while selecting one attempt this worker may execute.
    while True:
        async with session_scope() as session:
            now = utcnow()
            statement = (
                select(Operation)
                .where(
                    Operation.stopped_at.is_(None),
                    Operation.platform_version == env.VERSION,
                    Operation.scheduled_at <= now,
                    or_(Operation.lease_expires_at.is_(None), Operation.lease_expires_at <= now),
                )
                .order_by(Operation.created_at.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            operation = (await session.execute(statement)).scalars().first()

            # Return nothing when no operation is ready to run.
            if operation is None:
                return None

            # A worker that crashed on its final attempt leaves terminal failure for the next claimant to record.
            if operation.attempt_count >= OPERATION_ATTEMPT_LIMIT:
                operation.error = "Operation attempt limit exceeded"
                operation.stopped_at = now
                operation.lease_expires_at = None
                await session.commit()
                continue

            # Claim the next generation and begin its renewable lease.
            operation.error = None
            operation.started_at = now
            operation.attempt_count += 1
            operation.lease_expires_at = now + timedelta(seconds=OPERATION_LEASE_SECONDS)
            await session.commit()
            await session.refresh(operation)
            return operation


async def renew_lease(operation_id: UUID, attempt_count: int) -> Operation | None:
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
            return None

        await session.commit()
        refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
        return refreshed.scalar_one_or_none()


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
        operation.error = None
        operation.stopped_at = now
        operation.lease_expires_at = None

        await session.commit()
        await session.refresh(operation)
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
    error: str | None = None,
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
                error=sanitize_operation_error(error) if error is not None else None,
                started_at=None,
                scheduled_at=now + timedelta(seconds=max(0, delay_seconds)),
                lease_expires_at=None,
            )
        )
        result = await session.execute(statement)

        # A non-matching update means the attempt was superseded or its lease expired.
        if result.rowcount == 0:
            return None

        await session.commit()
        refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
        return refreshed.scalar_one_or_none()


async def fail(operation_id: UUID, error: str, attempt_count: int) -> Operation | None:
    """Fail an operation while the caller owns its unexpired lease."""

    # Persist a sanitized terminal error only for the current leased attempt.
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
                error=sanitize_operation_error(error),
                stopped_at=now,
                lease_expires_at=None,
            )
        )
        result = await session.execute(statement)

        # A non-matching update means the attempt was superseded or its lease expired.
        if result.rowcount == 0:
            return None

        await session.commit()
        refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
        return refreshed.scalar_one_or_none()
