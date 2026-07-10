import asyncio
import contextlib
from uuid import UUID
from src.logger import logger
from src.operations import execute
from src.database.services import operations

OPERATION_HEARTBEAT_SECONDS = 30


async def renew_operation_lease(operation_id: UUID, lease_token: str) -> None:
    """Keep one claimed operation leased while the current worker executes it."""

    # Keep extending the lease until execution finishes or ownership is lost.
    while True:
        await asyncio.sleep(max(1, OPERATION_HEARTBEAT_SECONDS))
        renewed = await operations.renew_lease(operation_id, lease_token)

        # Stop renewing if another worker or terminal state changed the lease.
        if renewed is None:
            logger.warning("Operation %s lease was lost", operation_id)
            return


async def run_operation_scheduler() -> None:
    """Continuously claim and execute scheduled operations."""

    # Keep polling the queue so new claimed operations are drained continuously.
    while True:
        operation = await operations.claim_next()

        # Sleep briefly when the queue has no claimable work.
        if operation is None:
            await asyncio.sleep(1)
            continue

        logger.info("Executing operation %s (%s)", operation.id, operation.kind)

        # Claimed rows should have a lease token, but skip defensively if not.
        if operation.lease_token is None:
            logger.warning("Skipping operation %s without a lease token", operation.id)
            continue

        heartbeat = asyncio.create_task(renew_operation_lease(operation.id, operation.lease_token))

        # Execute one claimed operation without stopping the worker on failure.
        try:
            result = await execute(operation)

            # Deferred operations are immediately claimable in tests, so yield before polling again.
            if result.started_at is None and result.stopped_at is None and result.step == operation.step:
                await asyncio.sleep(1)

        # Handler failures are recorded by execute and should not stop the worker loop.
        except Exception:
            logger.exception("Operation scheduler failed for %s (%s)", operation.id, operation.kind)

        # Heartbeats must always stop once this operation attempt is done.
        finally:

            # Stop the heartbeat task after the handler returns or raises.
            heartbeat.cancel()

            # Cancellation is expected when stopping the heartbeat task.
            with contextlib.suppress(asyncio.CancelledError):
                await heartbeat
