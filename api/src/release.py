import asyncio
from src.database.session import session_scope
from src.database.services import operations


async def schedule_reconciliation() -> None:
    """Schedule deployment reconciliation for every current resource desired state."""

    # Schedule deployment reconciliation targets in dependency order.
    async with session_scope() as session:
        await operations.schedule_reconciliation(session)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(schedule_reconciliation())
