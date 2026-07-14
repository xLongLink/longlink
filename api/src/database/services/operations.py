import re
import secrets
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import or_, select, update
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.operations import Operation

OPERATION_LEASE_SECONDS = 120
OPERATION_RETRY_DELAY_SECONDS = 5
OPERATION_ERROR_MAX_LENGTH = 2000
OPERATION_ERROR_TRUNCATION_MARKER = "... [truncated]"
URL_CREDENTIAL_PATTERN = re.compile(r"://([^\s/:@]+):([^\s/@]+)@")
AUTHORIZATION_SECRET_PATTERN = re.compile(
    r"(?i)([\"']?authorization[\"']?\s*[:=]\s*[\"']?(?:bearer\s+)?)[^\s'\",}]+([\"']?)"
)
ASSIGNED_SECRET_PATTERN = re.compile(
    r"(?i)((?<![a-z0-9_-])[\"']?"
    r"(?:secret_access_key|secret-access-key|access_key_id|access-key-id|client_key_data|client-key-data|"
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

    return (
        redacted_error[: OPERATION_ERROR_MAX_LENGTH - len(OPERATION_ERROR_TRUNCATION_MARKER)]
        + OPERATION_ERROR_TRUNCATION_MARKER
    )


async def fetch() -> list[Operation]:
    """Return all operations ordered by newest first."""

    # Read operations through a managed database session.
    async with session_scope() as session:
        statement = select(Operation).order_by(Operation.created_at.desc())
        result = await session.execute(statement)
        return result.scalars().all()


async def get(operation_id: UUID) -> Operation | None:
    """Return one operation by id."""

    # Read the operation through a managed database session.
    async with session_scope() as session:
        statement = select(Operation).where(Operation.id == operation_id)
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def reset_active() -> None:
    """Return expired active operations to the scheduled queue.

    Startup and recovery paths use this to clear stale leases left by stopped workers. Healthy workers keep ownership
    because only rows with expired leases are reset.
    """

    # Reset expired leases inside one transaction.
    async with session_scope() as session:
        now = utcnow()

        # Only expired leases are reset so healthy workers keep ownership while the API scales out.
        statement = (
            update(Operation)
            .where(
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
                or_(
                    Operation.lease_expires_at.is_(None),
                    Operation.lease_expires_at < now,
                ),
            )
            .values(
                started_at=None,
                error=None,
                lease_token=None,
                lease_expires_at=None,
                updated_at=now,
            )
        )
        await session.execute(statement)
        await session.commit()


async def create(
    kind: OperationKind,
    application_id: UUID | None = None,
    organization_id: UUID | None = None,
    scheduled_at: datetime | None = None,
    user: User | None = None,
) -> Operation:
    """Create a scheduled operation record without claiming it.

    Endpoint handlers call this after writing domain state. The worker later claims the row, receives a lease token, and
    runs the handler registered for the operation kind.
    """

    # Persist the operation in a managed database session.
    async with session_scope() as session:
        operation = Operation(
            kind=kind,
            application_id=application_id,
            organization_id=organization_id,
            scheduled_at=scheduled_at,
        )

        # Attribute the operation to the caller when available.
        if user is not None:
            operation.created_id = user.id
            operation.updated_id = user.id
        session.add(operation)
        await session.commit()
        await session.refresh(operation)
        return operation


async def queue_organization_removal(organization_id: UUID, scheduled_at: datetime | None = None, user: User | None = None) -> Operation:
    """Queue a metadata-only operation that removes one deleted organization's runtime resources."""

    # Organization cleanup only needs the organization reference and optional schedule.
    return await create(OperationKind.organization_remove, organization_id=organization_id, scheduled_at=scheduled_at, user=user)


async def claim(operation_id: UUID) -> Operation | None:
    """Claim one requested operation for exclusive execution.

    Only scheduled rows with no active lease or an expired lease can be claimed. Claiming stores a fresh lease token and
    expiry; later state transitions must present the same token to prove this worker still owns the attempt.
    """

    # Claim the requested operation inside one transaction.
    async with session_scope() as session:
        now = utcnow()
        statement = (
            select(Operation)
            .where(
                Operation.id == operation_id,
                Operation.stopped_at.is_(None),
                or_(Operation.scheduled_at.is_(None), Operation.scheduled_at <= now),
                or_(
                    Operation.started_at.is_(None),
                    Operation.lease_expires_at.is_(None),
                    Operation.lease_expires_at < now,
                ),
            )
            .with_for_update(skip_locked=True)
        )
        # Stop when another worker already owns the operation.
        operation = (await session.execute(statement)).scalars().first()
        if operation is None:
            return None

        operation.started_at = operation.started_at or now
        operation.lease_token = secrets.token_urlsafe(24)
        operation.lease_expires_at = now + timedelta(seconds=OPERATION_LEASE_SECONDS)
        operation.updated_at = now
        await session.commit()
        await session.refresh(operation)
        return operation


async def defer(operation_id: UUID, lease_token: str, delay_seconds: int | None = None) -> Operation | None:
    """Release an active lease and schedule the operation for another attempt.

    The update matches both operation id and lease token. Returning `None` means the caller no longer owns the active
    lease, so another worker may already be responsible for the operation.
    """

    # Release the operation lease inside one transaction.
    async with session_scope() as session:

        # Waiting work should be retried later without blocking the worker.
        now = utcnow()
        retry_delay_seconds = OPERATION_RETRY_DELAY_SECONDS if delay_seconds is None else delay_seconds
        scheduled_at = now + timedelta(seconds=max(0, retry_delay_seconds))
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_token == lease_token,
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
            )
            .values(
                started_at=None,
                error=None,
                lease_token=None,
                scheduled_at=scheduled_at,
                lease_expires_at=None,
                updated_at=now,
            )
        )
        result = await session.execute(statement)

        # Treat stale leases as already handled by another worker.
        if result.rowcount == 0:
            return None

        await session.commit()
        refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
        return refreshed.scalar_one_or_none()


async def claim_next() -> Operation | None:
    """Claim the oldest ready operation for exclusive execution.

    Worker loops use this as the queue pop operation. It locks one ready row, assigns a fresh lease token, and returns
    `None` when no scheduled or expired work is currently claimable.
    """

    # Claim the next available operation inside one transaction.
    async with session_scope() as session:
        now = utcnow()

        # Select the oldest claimable row so work is processed in submission order.
        statement = (
            select(Operation)
            .where(
                Operation.stopped_at.is_(None),
                or_(Operation.scheduled_at.is_(None), Operation.scheduled_at <= now),
                or_(
                    Operation.started_at.is_(None),
                    Operation.lease_expires_at.is_(None),
                    Operation.lease_expires_at < now,
                ),
            )
            .order_by(Operation.created_at.asc())
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        result = await session.execute(statement)

        # Return nothing when no operation is ready to run.
        operation = result.scalars().first()
        if operation is None:
            return None

        operation.started_at = operation.started_at or now
        operation.lease_token = secrets.token_urlsafe(24)
        operation.lease_expires_at = now + timedelta(seconds=OPERATION_LEASE_SECONDS)
        operation.updated_at = now
        await session.commit()
        await session.refresh(operation)
        return operation


async def renew_lease(operation_id: UUID, lease_token: str) -> Operation | None:
    """Extend the current worker's active operation lease.

    The lease token check prevents stale workers from renewing after another worker has reclaimed an expired operation.
    Returning `None` tells the heartbeat that ownership was lost and renewal should stop.
    """

    # Extend the lease inside one transaction.
    async with session_scope() as session:
        now = utcnow()
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_token == lease_token,
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
            )
            .values(
                lease_expires_at=now + timedelta(seconds=OPERATION_LEASE_SECONDS),
                updated_at=now,
            )
        )
        result = await session.execute(statement)

        # Treat missing rows as stale worker ownership.
        if result.rowcount == 0:
            return None

        await session.commit()
        refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
        return refreshed.scalar_one_or_none()


async def complete(operation_id: UUID, lease_token: str) -> Operation | None:
    """Finish an operation only if the caller still owns its lease.

    Successful completion records `stopped_at` and clears lease fields. A `None` result means the token no longer matches,
    so the caller should treat its result as stale.
    """

    # Complete the operation inside one transaction.
    async with session_scope() as session:

        # Finalize the row once after successful execution.
        now = utcnow()
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_token == lease_token,
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
            )
            .values(
                stopped_at=now,
                error=None,
                lease_token=None,
                lease_expires_at=None,
                updated_at=now,
            )
        )
        result = await session.execute(statement)

        # Treat missing rows as stale worker ownership.
        if result.rowcount == 0:
            return None

        await session.commit()
        refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
        return refreshed.scalar_one_or_none()


async def fail(operation_id: UUID, error: str, lease_token: str) -> Operation | None:
    """Fail an operation only if the caller still owns its lease.

    The public error text is sanitized before it is stored. A `None` result means another worker or terminal transition
    changed the row first, so the caller should not overwrite it.
    """

    # Record the failure inside one transaction.
    async with session_scope() as session:

        # Persist the failure exactly once so the row remains a reliable audit trail.
        now = utcnow()
        sanitized_error = sanitize_operation_error(error)
        statement = (
            update(Operation)
            .where(
                Operation.id == operation_id,
                Operation.lease_token == lease_token,
                Operation.started_at.is_not(None),
                Operation.stopped_at.is_(None),
            )
            .values(
                stopped_at=now,
                error=sanitized_error,
                lease_token=None,
                lease_expires_at=None,
                updated_at=now,
            )
        )
        result = await session.execute(statement)

        # Treat missing rows as stale worker ownership.
        if result.rowcount == 0:
            return None

        await session.commit()
        refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
        return refreshed.scalar_one_or_none()
