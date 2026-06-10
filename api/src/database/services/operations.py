from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update

from .base import ServiceBase
from src.database.models.operation import Operation
from src.models.operations import OperationStatus


class OperationsService(ServiceBase):
    """Manage long-running platform operations."""

    async def list(self) -> list[Operation]:
        """Return all operations ordered by newest first."""

        async with self.session() as session:
            statement = select(Operation).order_by(Operation.created_at.desc(), Operation.id.desc())
            result = await session.execute(statement)
            return result.scalars().all()


    async def get(self, operation_id: int) -> Operation | None:
        """Return one operation by id."""

        async with self.session() as session:
            statement = select(Operation).where(Operation.id == operation_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def list_active(self) -> list[Operation]:
        """Return all active operations ordered by oldest first."""

        async with self.session() as session:
            statement = select(Operation).where(Operation.status == OperationStatus.active).order_by(
                Operation.started_at.asc().nullsfirst(),
                Operation.created_at.asc(),
                Operation.id.asc(),
            )
            result = await session.execute(statement)
            return result.scalars().all()


    async def create(
        self,
        kind: str,
        payload: dict[str, Any] | None = None,
        status: OperationStatus = OperationStatus.scheduled,
    ) -> Operation:
        """Create one operation record."""

        async with self.session() as session:
            operation = Operation(kind=kind, payload=payload or {}, status=status)
            session.add(operation)
            await session.commit()
            await session.refresh(operation)
            return operation


    async def claim(self, operation_id: int) -> Operation | None:
        """Mark one scheduled operation as active if it has not started yet."""

        async with self.session() as session:
            # Claim the row atomically so multiple replicas cannot start the same operation twice.
            statement = (
                update(Operation)
                .where(Operation.id == operation_id, Operation.status == OperationStatus.scheduled)
                .values(status=OperationStatus.active, started_at=datetime.now(UTC))
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def ready(self, operation_id: int) -> Operation | None:
        """Mark one active operation as ready for finalization."""

        async with self.session() as session:
            # Release the operation into the ready state once the resources are provisioned.
            statement = (
                update(Operation)
                .where(Operation.id == operation_id, Operation.status == OperationStatus.active)
                .values(status=OperationStatus.ready)
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def requeue(self, operation_id: int) -> Operation | None:
        """Move one active operation back to the scheduled queue."""

        async with self.session() as session:
            # Reset the row so a restarted worker can claim it again from scratch.
            statement = (
                update(Operation)
                .where(Operation.id == operation_id, Operation.status == OperationStatus.active)
                .values(status=OperationStatus.scheduled, started_at=None, stopped_at=None, error=None)
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def claim_next(self) -> Operation | None:
        """Claim the next scheduled operation in FIFO order."""

        async with self.session() as session:
            # Select the oldest scheduled row so work is processed in submission order.
            statement = (
                select(Operation)
                .where(Operation.status == OperationStatus.scheduled)
                .order_by(Operation.created_at.asc(), Operation.id.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            result = await session.execute(statement)
            operation = result.scalars().first()
            if operation is None:
                return None

            operation.status = OperationStatus.active
            operation.started_at = datetime.now(UTC)
            await session.commit()
            await session.refresh(operation)
            return operation


    async def complete(self, operation_id: int) -> Operation | None:
        """Mark one ready operation as completed."""

        async with self.session() as session:
            # Finalize the row once after successful execution.
            statement = (
                update(Operation)
                .where(
                Operation.id == operation_id,
                Operation.status == OperationStatus.ready,
                Operation.stopped_at.is_(None),
            )
            .values(status=OperationStatus.completed, stopped_at=datetime.now(UTC), error=None)
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def fail(self, operation_id: int, error: str) -> Operation | None:
        """Mark one active operation as failed and capture the error message."""

        async with self.session() as session:
            # Persist the failure exactly once so the row remains a reliable audit trail.
            statement = (
                update(Operation)
                .where(
                    Operation.id == operation_id,
                    Operation.status.in_((OperationStatus.active, OperationStatus.ready)),
                    Operation.stopped_at.is_(None),
                )
                .values(status=OperationStatus.failed, stopped_at=datetime.now(UTC), error=error)
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


operations = OperationsService()
