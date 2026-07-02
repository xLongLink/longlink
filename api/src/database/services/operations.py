import secrets
from uuid import UUID
from datetime import UTC, datetime, timedelta
from sqlalchemy import or_, select, update
from src.environments import env
from src.database.session import session_scope
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.operations import Operation


class OperationsService:
    """Manage long-running platform operations."""

    async def list(self) -> list[Operation]:
        """Return all operations ordered by newest first."""

        async with session_scope() as session:
            statement = select(Operation).order_by(Operation.created_at.desc())
            result = await session.execute(statement)
            return result.scalars().all()


    async def get(self, operation_id: UUID) -> Operation | None:
        """Return one operation by id."""

        async with session_scope() as session:
            statement = select(Operation).where(Operation.id == operation_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def reset_active(self) -> None:
        """Return expired active operations to the scheduled queue."""

        async with session_scope() as session:
            now = datetime.now(UTC)
            # Only expired leases are reset so healthy workers keep ownership while the API scales out.
            statement = (
                update(Operation)
                .where(
                    Operation.started_at.is_not(None),
                    Operation.stopped_at.is_(None),
                    or_(Operation.lease_expires_at.is_(None), Operation.lease_expires_at < now),
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
        self,
        kind: OperationKind,
        step: str,
        application_id: UUID | None = None,
        organization_id: UUID | None = None,
        scheduled_at: datetime | None = None,
        user: User | None = None,
    ) -> Operation:
        """Create one operation record."""

        async with session_scope() as session:
            operation = Operation(
                kind=kind,
                application_id=application_id,
                organization_id=organization_id,
                scheduled_at=scheduled_at,
                step=step,
            )
            if user is not None:
                operation.created_id = user.id
                operation.updated_id = user.id
            session.add(operation)
            await session.commit()
            await session.refresh(operation)
            return operation

    async def claim(self, operation_id: UUID) -> Operation | None:
        """Mark one scheduled or expired operation as active."""

        async with session_scope() as session:
            now = datetime.now(UTC)
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
            operation = (await session.execute(statement)).scalars().first()
            if operation is None:
                return None

            operation.started_at = operation.started_at or now
            operation.lease_token = secrets.token_urlsafe(24)
            operation.lease_expires_at = now + timedelta(seconds=env.OPERATION_LEASE_SECONDS)
            operation.updated_at = now
            await session.commit()
            await session.refresh(operation)
            return operation


    async def defer(self, operation_id: UUID, lease_token: str) -> Operation | None:
        """Make one active operation claimable later without changing its step."""

        async with session_scope() as session:
            # A waiting step should be retried later without blocking the worker.
            now = datetime.now(UTC)
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
                    lease_expires_at=None,
                    updated_at=now,
                )
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def claim_next(self) -> Operation | None:
        """Claim the next scheduled or expired operation in FIFO order."""

        async with session_scope() as session:
            now = datetime.now(UTC)
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
            operation = result.scalars().first()
            if operation is None:
                return None

            operation.started_at = operation.started_at or now
            operation.lease_token = secrets.token_urlsafe(24)
            operation.lease_expires_at = now + timedelta(seconds=env.OPERATION_LEASE_SECONDS)
            operation.updated_at = now
            await session.commit()
            await session.refresh(operation)
            return operation


    async def renew_lease(self, operation_id: UUID, lease_token: str) -> Operation | None:
        """Extend one active operation lease for the current worker."""

        async with session_scope() as session:
            now = datetime.now(UTC)
            statement = (
                update(Operation)
                .where(
                    Operation.id == operation_id,
                    Operation.lease_token == lease_token,
                    Operation.started_at.is_not(None),
                    Operation.stopped_at.is_(None),
                )
                .values(
                    lease_expires_at=now + timedelta(seconds=env.OPERATION_LEASE_SECONDS),
                    updated_at=now,
                )
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def complete(self, operation_id: UUID, lease_token: str) -> Operation | None:
        """Mark one active operation as completed."""

        async with session_scope() as session:
            # Finalize the row once after successful execution.
            now = datetime.now(UTC)
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
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def fail(self, operation_id: UUID, error: str, lease_token: str) -> Operation | None:
        """Mark one active operation as failed and capture the error message."""

        async with session_scope() as session:
            # Persist the failure exactly once so the row remains a reliable audit trail.
            now = datetime.now(UTC)
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
                    error=error,
                    lease_token=None,
                    lease_expires_at=None,
                    updated_at=now,
                )
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


operations = OperationsService()
