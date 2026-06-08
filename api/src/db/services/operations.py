from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update

from .base import ServiceBase
from src.db.models import Operation


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


    async def create(self, kind: str, payload: dict[str, Any] | None = None) -> Operation:
        """Create one queued operation."""

        async with self.session() as session:
            operation = Operation(kind=kind, payload=payload or {})
            session.add(operation)
            await session.commit()
            await session.refresh(operation)
            return operation


    async def start(self, operation_id: int) -> Operation | None:
        """Mark one operation as started if it has not started yet."""

        async with self.session() as session:
            # Claim the row atomically so multiple replicas cannot start the same operation twice.
            statement = (
                update(Operation)
                .where(Operation.id == operation_id, Operation.started_at.is_(None))
                .values(started_at=datetime.now(UTC))
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()


    async def stop(self, operation_id: int) -> Operation | None:
        """Mark one operation as stopped if it has started."""

        async with self.session() as session:
            # Stop the row once, regardless of whether the operation succeeded or failed.
            statement = (
                update(Operation)
                .where(Operation.id == operation_id, Operation.started_at.is_not(None), Operation.stopped_at.is_(None))
                .values(stopped_at=datetime.now(UTC))
            )
            result = await session.execute(statement)
            if result.rowcount == 0:
                return None

            await session.commit()
            refreshed = await session.execute(select(Operation).where(Operation.id == operation_id))
            return refreshed.scalar_one_or_none()
