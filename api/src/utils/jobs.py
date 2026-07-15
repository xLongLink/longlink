import asyncio
from enum import StrEnum
from uuid import UUID
from fastapi import HTTPException
from src.logger import logger
from dataclasses import dataclass
from collections.abc import Callable, Awaitable
from src.database.services import operations
from src.database.models.operations import Operation

OPERATION_POLL_SECONDS = 1
OPERATION_HEARTBEAT_SECONDS = 30
OPERATION_RETRY_BASE_SECONDS = 5
OPERATION_RETRY_MAX_SECONDS = 5 * 60
OPERATION_HANDLER_TIMEOUT_SECONDS = 20 * 60
OPERATION_ATTEMPT_LIMIT = operations.OPERATION_ATTEMPT_LIMIT


class OperationLeaseLost(RuntimeError):
    """Raised when a worker no longer owns an operation attempt."""

    operation_id: UUID

    def __init__(self, operation_id: UUID) -> None:
        """Record the operation whose lease was lost."""

        self.operation_id = operation_id
        super().__init__(f"Operation '{operation_id}' lease was lost")


class OperationOutcomeState(StrEnum):
    """Supported results from one operation handler attempt."""

    complete = "complete"
    fail = "fail"
    retry = "retry"


@dataclass(frozen=True)
class OperationOutcome:
    """Represent the requested state transition after a handler attempt."""

    state: OperationOutcomeState
    error: str | None = None


JobHandler = Callable[[Operation], Awaitable[OperationOutcome]]


def complete() -> OperationOutcome:
    """Return an outcome that completes the operation."""

    # The dispatcher owns the database transition for completed operations.
    return OperationOutcome(OperationOutcomeState.complete)


def retry(error: str | None = None) -> OperationOutcome:
    """Return a transient outcome that retries the operation with bounded backoff."""

    # The dispatcher derives the delay from the persisted attempt count.
    return OperationOutcome(OperationOutcomeState.retry, error=error)


def fail(error: str) -> OperationOutcome:
    """Return an outcome that fails the operation with a public error message."""

    # The dispatcher owns error sanitization and terminal persistence.
    return OperationOutcome(OperationOutcomeState.fail, error=error)


async def execute(operation: Operation, handler: JobHandler) -> Operation:
    """Run one claimed handler attempt and persist its requested outcome."""

    # Claimed operations must carry the attempt generation needed for fenced state transitions.
    attempt_count = operation.attempt_count
    if attempt_count < 1 or operation.lease_expires_at is None:
        raise ValueError("Operation must be claimed before execution")

    logger.info("Running location reconciliation %s", operation.id)

    # Convert expected handler failures into explicit outcomes without wrapping database transitions.
    try:
        async with asyncio.timeout(OPERATION_HANDLER_TIMEOUT_SECONDS):
            outcome = await handler(operation)
    except OperationLeaseLost:
        raise
    except TimeoutError:
        logger.warning("Operation %s attempt timed out", operation.id)
        outcome = retry("Operation attempt timed out")
    except HTTPException as exc:
        detail = str(exc.detail)
        logger.warning("Operation %s failed: %s", operation.id, detail)
        outcome = fail(detail)
    except Exception as exc:
        logger.exception("Operation %s failed: %r", operation.id, exc)
        outcome = retry(str(exc))

    # Persist exactly one transition while the claim's lease remains valid.
    match outcome.state:
        case OperationOutcomeState.complete:
            updated = await operations.complete(operation.id, attempt_count)
        case OperationOutcomeState.retry:
            if attempt_count >= OPERATION_ATTEMPT_LIMIT:
                updated = await operations.fail(
                    operation.id,
                    outcome.error or "Operation retry limit exceeded",
                    attempt_count,
                )
            else:
                exponent = min(attempt_count - 1, 30)
                delay = min(OPERATION_RETRY_BASE_SECONDS * (2**exponent), OPERATION_RETRY_MAX_SECONDS)
                updated = await operations.defer(operation.id, attempt_count, delay, outcome.error)
        case OperationOutcomeState.fail:
            updated = await operations.fail(
                operation.id,
                outcome.error or "Operation failed",
                attempt_count,
            )
        case _:
            raise ValueError(f"Unsupported operation outcome '{outcome.state}'")

    # Never return a stale in-memory row when the requested transition lost ownership.
    if updated is None:
        raise OperationLeaseLost(operation.id)

    return updated


async def renew_operation_lease(operation_id: UUID, attempt_count: int) -> None:
    """Keep one operation lease alive and raise as soon as ownership is lost."""

    # Keep extending the lease until execution finishes or another worker owns the row.
    while True:
        await asyncio.sleep(max(1, OPERATION_HEARTBEAT_SECONDS))
        renewed = await operations.renew_lease(operation_id, attempt_count)

        # Signal the scheduler so it can cancel the stale handler immediately.
        if renewed is None:
            raise OperationLeaseLost(operation_id)


async def run_claimed_operation(operation: Operation, handler: JobHandler) -> Operation:
    """Execute one claimed operation while renewing its lease in parallel."""

    # The action and heartbeat share one lifetime so neither survives a completed or lost attempt.
    action = asyncio.create_task(execute(operation, handler))
    heartbeat = asyncio.create_task(renew_operation_lease(operation.id, operation.attempt_count))
    try:
        done, _ = await asyncio.wait({action, heartbeat}, return_when=asyncio.FIRST_COMPLETED)
        if action in done:
            return await action
        await heartbeat
        raise OperationLeaseLost(operation.id)
    finally:
        action.cancel()
        heartbeat.cancel()
        await asyncio.gather(action, heartbeat, return_exceptions=True)


async def run_operation_scheduler(handler: JobHandler) -> None:
    """Continuously claim and execute one leased operation action at a time."""

    # Keep polling after transient database failures so the worker remains available.
    while True:
        try:
            operation = await operations.claim_next()
        except Exception as exc:
            logger.exception("Operation scheduler polling failed: %r", exc)
            await asyncio.sleep(OPERATION_POLL_SECONDS)
            continue

        # Sleep briefly when the queue has no claimable work.
        if operation is None:
            await asyncio.sleep(OPERATION_POLL_SECONDS)
            continue

        logger.info("Executing location reconciliation %s", operation.id)

        # Run one complete leased attempt before claiming more work.
        try:
            result = await run_claimed_operation(operation, handler)

            # Yield after a retry so immediately due work cannot monopolize the scheduler.
            if result.started_at is None and result.stopped_at is None:
                await asyncio.sleep(OPERATION_POLL_SECONDS)
        except OperationLeaseLost as exc:
            logger.warning("%s", exc)
        except Exception as exc:
            logger.exception("Operation scheduler failed for %s: %r", operation.id, exc)
