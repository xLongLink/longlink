import asyncio
import contextlib
from enum import StrEnum
from uuid import UUID
from typing import cast
from fastapi import HTTPException
from src.logger import logger
from dataclasses import dataclass
from collections.abc import Callable, Awaitable
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.operations import Operation

OPERATION_HEARTBEAT_SECONDS = 30


class OperationOutcomeState(StrEnum):
    """Supported results from one operation handler attempt."""

    complete = "complete"
    defer = "defer"
    fail = "fail"


@dataclass(frozen=True)
class OperationOutcome:
    """Represent the requested state transition after a handler attempt."""

    state: OperationOutcomeState
    error: str | None = None
    delay: int | None = None


JobHandler = Callable[[Operation], Awaitable[OperationOutcome]]

handlers: dict[OperationKind, JobHandler] = {}


def complete() -> OperationOutcome:
    """Return an outcome that completes the operation."""

    # The dispatcher owns the database transition for completed operations.
    return OperationOutcome(OperationOutcomeState.complete)


def defer(delay: int | None = None) -> OperationOutcome:
    """Return an outcome that schedules the operation for a later attempt."""

    # The dispatcher owns lease release and retry scheduling.
    return OperationOutcome(OperationOutcomeState.defer, delay=delay)


def fail(error: str) -> OperationOutcome:
    """Return an outcome that fails the operation with a public error message."""

    # The dispatcher owns error sanitization and terminal persistence.
    return OperationOutcome(OperationOutcomeState.fail, error=error)


def operation_handler(kind: OperationKind) -> Callable[[JobHandler], JobHandler]:
    """Register one operation handler for a background job kind."""

    def decorator(handler: JobHandler) -> JobHandler:
        """Store the handler under its operation kind."""

        # Refuse duplicate handlers so job routing stays deterministic.
        if kind in handlers:
            raise ValueError(f"Operation handler already registered for '{kind}'")

        handlers[kind] = handler
        return handler

    return decorator


async def execute(operation: Operation) -> Operation:
    """Run a claimed operation handler and persist its requested outcome.

    Flow:
        endpoint writes domain state
            -> queue operation metadata
            -> worker claims row and receives a lease token
            -> execute dispatches the registered handler
            -> handler returns complete, defer, or fail
            -> execute persists that outcome with the active lease token

    Callers must pass an operation returned by `claim` or `claim_next`. The row carries a lease token that identifies the
    worker currently allowed to mutate it. Completion, deferral, and failure updates all include that token so a stale
    worker cannot overwrite another worker after an expired lease has been reclaimed.
    """

    # Claimed operations must carry the lease token needed for state transitions.
    lease_token = operation.lease_token
    if lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    # Dispatch the handler and convert raised errors into persisted operation failures.
    try:

        # Resolve the operation handler before dispatching the operation.
        handler = handlers.get(operation.kind)
        if handler is None:
            raise ValueError(f"Unsupported operation '{operation.kind}'")

        logger.info("Running operation %s (%s)", operation.id, operation.kind)
        outcome = await handler(operation)

        # Persist the handler outcome exactly once while this worker owns the lease.
        match outcome.state:
            case OperationOutcomeState.complete:
                updated = await operations.complete(operation.id, lease_token)

            case OperationOutcomeState.defer:
                updated = await operations.defer(operation.id, lease_token, outcome.delay)

            case OperationOutcomeState.fail:
                updated = await operations.fail(operation.id, outcome.error or "Operation failed", lease_token)

            case _:
                raise ValueError(f"Unsupported operation outcome '{outcome.state}'")

        return updated or operation

    # Persist handler failures on the operation row before returning control to the worker.
    except Exception as exc:
        detail = str(exc.detail) if isinstance(exc, HTTPException) else str(exc)

        # HTTP errors are expected domain failures, while other exceptions need a traceback.
        if isinstance(exc, HTTPException):
            logger.warning("Operation %s failed: %s", operation.id, detail)

        # Unexpected operation failures need tracebacks for debugging.
        else:
            logger.exception("Operation %s failed: %r", operation.id, exc)

        failed = await operations.fail(operation.id, detail, lease_token)

        # Return the persisted failure row when this worker still owns the lease.
        if failed is not None:
            return failed

        raise


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
