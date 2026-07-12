import asyncio
import contextlib
from uuid import UUID
from typing import cast
from src.logger import logger
from src.operations import execute
from src.database.services import operations

OPERATION_HEARTBEAT_SECONDS = 30


async def renew_operation_lease(operation_id: UUID, lease_token: str) -> None:
    """Keep the current worker's operation lease alive until execution finishes.

    The lease token is the worker's ownership proof for the active attempt. When renewal returns no row, this worker no
    longer owns the operation because it was completed, failed, or reclaimed after expiry.
    """

    # Keep extending the lease until execution finishes or ownership is lost.
    while True:
        await asyncio.sleep(max(1, OPERATION_HEARTBEAT_SECONDS))

        # Stop renewing if another worker or terminal state changed the lease.
        renewed = await operations.renew_lease(operation_id, lease_token)
        if renewed is None:
            logger.warning("Operation %s lease was lost", operation_id)
            return


async def run_operation_scheduler() -> None:
    """Continuously claim scheduled operations and run one leased attempt at a time.

    Each claimed operation receives a lease token from the database. The scheduler starts a heartbeat for that token,
    dispatches the operation handler, then cancels the heartbeat before polling for more work.
    """

    # Keep polling the queue so new claimed operations are drained continuously.
    while True:
        # Sleep briefly when the queue has no claimable work.
        operation = await operations.claim_next()
        if operation is None:
            await asyncio.sleep(1)
            continue

        logger.info("Executing operation %s (%s)", operation.id, operation.kind)
        lease_token = cast(str, operation.lease_token)
        heartbeat = asyncio.create_task(renew_operation_lease(operation.id, lease_token))

        # Execute one claimed operation without stopping the worker on failure.
        try:
            result = await execute(operation)

            # Deferred operations can become claimable quickly in tests, so yield before polling again.
            if result.started_at is None and result.stopped_at is None:
                await asyncio.sleep(1)

        # Handler failures are recorded by execute and should not stop the worker loop.
        except Exception as exc:
            logger.exception("Operation scheduler failed for %s (%s): %r", operation.id, operation.kind, exc)

        # Heartbeats must always stop once this operation attempt is done.
        finally:

            # Stop the heartbeat task after the handler returns or raises.
            heartbeat.cancel()

            # Cancellation is expected when stopping the heartbeat task.
            with contextlib.suppress(asyncio.CancelledError):
                await heartbeat
