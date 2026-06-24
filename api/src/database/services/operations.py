from __future__ import annotations

from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select, update
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
        """Return interrupted active operations to the scheduled queue."""

        async with session_scope() as session:
            # Active only means claimed, so a restart can safely make those rows claimable again.
            statement = (
                update(Operation)
                .where(Operation.started_at.is_not(None), Operation.stopped_at.is_(None))
                .values(started_at=None, error=None, updated_at=datetime.now(UTC))
            )
            await session.execute(statement)
            await session.commit()


    async def create(
        self,
        kind: OperationKind,
        step: str,
        application_id: UUID | None = None,
        user: User | None = None,
    ) -> Operation:
        """Create one operation record."""

        async with session_scope() as session:
            operation = Operation(kind=kind, application_id=application_id, step=step)
            if user is not None:
                operation.created_id = user.id
                operation.updated_id = user.id
            session.add(operation)
            await session.commit()
            await session.refresh(operation)
            return operation


    async def claim(self, operation_id: UUID) -> Operation | None:
        """Mark one scheduled operation as active if it has not started yet."""

        async with session_scope() as session:
            # Claim the row atomically so multiple replicas cannot start the same operation twice.
            statement = (
                update(Operation)
                .where(Operation.id == operation_id, Operation.started_at.is_(None), Operation.stopped_at.is_(None))
                .values(started_at=datetime.now(UTC), updated_at=datetime.now(UTC))
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def defer(self, operation_id: UUID) -> Operation | None:
        """Make one active operation claimable later without changing its step."""

        async with session_scope() as session:
            # A waiting step should be retried later without blocking the worker.
            statement = (
                update(Operation)
                .where(Operation.id == operation_id, Operation.started_at.is_not(None), Operation.stopped_at.is_(None))
                .values(started_at=None, error=None, updated_at=datetime.now(UTC))
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def claim_next(self) -> Operation | None:
        """Claim the next scheduled operation in FIFO order."""

        async with session_scope() as session:
            # Select the oldest scheduled row so work is processed in submission order.
            statement = (
                select(Operation)
                .where(Operation.started_at.is_(None), Operation.stopped_at.is_(None))
                .order_by(Operation.created_at.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            result = await session.execute(statement)
            operation = result.scalars().first()
            if operation is None:
                return None

            operation.started_at = datetime.now(UTC)
            await session.commit()
            await session.refresh(operation)
            return operation


    async def complete(self, operation_id: UUID) -> Operation | None:
        """Mark one active operation as completed."""

        async with session_scope() as session:
            # Finalize the row once after successful execution.
            statement = (
                update(Operation)
                .where(
                    Operation.id == operation_id,
                    Operation.started_at.is_not(None),
                    Operation.stopped_at.is_(None),
                )
                .values(stopped_at=datetime.now(UTC), error=None, updated_at=datetime.now(UTC))
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def fail(self, operation_id: UUID, error: str) -> Operation | None:
        """Mark one active operation as failed and capture the error message."""

        async with session_scope() as session:
            # Persist the failure exactly once so the row remains a reliable audit trail.
            statement = (
                update(Operation)
                .where(
                    Operation.id == operation_id,
                    Operation.started_at.is_not(None),
                    Operation.stopped_at.is_(None),
                )
                .values(stopped_at=datetime.now(UTC), error=error, updated_at=datetime.now(UTC))
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


operations = OperationsService()
