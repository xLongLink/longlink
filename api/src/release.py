import asyncio
from sqlmodel import col
from sqlalchemy import select
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import operations
from src.database.models.operations import Operation


async def schedule_reconciliation() -> None:
    """Schedule deployment reconciliation for every current resource desired state."""

    # Schedule deployment reconciliation targets in dependency order.
    async with session_scope() as session:
        # Old workers must stop before release reconciliation can reuse their unfinished work.
        active = await session.scalar(
            select(col(Operation.id)).where(col(Operation.finished_at).is_(None), col(Operation.lease_expires_at) > utcnow()).limit(1)
        )
        if active is not None:
            raise RuntimeError("Stop existing API workers and let their leases release or expire before scheduling a release")
        await operations.schedule_reconciliation(session)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(schedule_reconciliation())
