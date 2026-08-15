import asyncio
from src.errors import NotFoundError
from src.database.session import session_scope
from src.database.services import operations as operation_service


async def schedule_reconciliation() -> None:
    """Schedule deployment reconciliation for every current resource desired state."""

    # Discover deployment reconciliation targets in dependency order.
    async with session_scope() as session:
        targets = await operation_service.discover(session)

        # Create or reuse every desired-state operation in one transaction.
        for kind, target_id, compute_id in targets:
            # Skip targets whose Compute was deleted after release discovery.
            try:
                await operation_service.enqueue(
                    session,
                    compute_id,
                    kind=kind,
                    target_id=target_id,
                )
            except NotFoundError:
                continue
        await session.commit()


def main() -> None:
    """Run deployment reconciliation scheduling as a one-shot process."""

    # Keep the synchronous script boundary separate from the asynchronous database service.
    asyncio.run(schedule_reconciliation())


if __name__ == "__main__":
    main()
