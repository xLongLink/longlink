import asyncio
from enum import StrEnum
from fastapi import HTTPException
from src.logger import logger
from dataclasses import dataclass
from collections.abc import Callable, Awaitable
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.operations import Operation

OPERATION_RETRY_BASE_SECONDS = 5
OPERATION_RETRY_MAX_SECONDS = 5 * 60
OPERATION_HANDLER_TIMEOUT_SECONDS = 20 * 60
OPERATION_ATTEMPT_LIMIT = operations.OPERATION_ATTEMPT_LIMIT


class OperationOutcomeState(StrEnum):
    """Supported results from one operation handler attempt."""

    complete = "complete"
    fail = "fail"
    retry = "retry"


@dataclass(frozen=True)
class OperationOutcome:
    """Represent the requested state transition after a handler attempt."""

    state: OperationOutcomeState
    reason: str | None = None


JobHandler = Callable[[Operation], Awaitable[OperationOutcome]]

handlers: dict[str, JobHandler] = {}


def operation(name: str) -> Callable[[JobHandler], JobHandler]:
    """Return a decorator that registers an operation handler by name."""

    # Reject empty names before they can create unreachable registry entries.
    if not name.strip():
        raise ValueError("Operation name cannot be empty")

    def decorator(handler: JobHandler) -> JobHandler:
        """Register one operation handler while preserving the decorated function."""

        # Refuse duplicates so operation dispatch remains deterministic.
        if name in handlers:
            raise ValueError(f"Operation handler already registered for '{name}'")
        handlers[name] = handler
        return handler

    return decorator


def validate_handlers() -> None:
    """Require one registered handler for every persisted operation kind."""

    # Fail startup when a handler is missing or registered under an unsupported name.
    expected = {kind.value for kind in OperationKind}
    registered = set(handlers)
    if registered != expected:
        missing = sorted(expected - registered)
        unsupported = sorted(registered - expected)
        raise RuntimeError(f"Invalid operation handlers; missing={missing}, unsupported={unsupported}")


def complete() -> OperationOutcome:
    """Return an outcome that completes the operation."""

    # The dispatcher owns the database transition for completed operations.
    return OperationOutcome(OperationOutcomeState.complete)


def retry(reason: str | None = None) -> OperationOutcome:
    """Return a transient outcome that retries the operation with bounded backoff."""

    # The dispatcher derives the delay from the persisted attempt count.
    return OperationOutcome(OperationOutcomeState.retry, reason=reason)


def fail(reason: str) -> OperationOutcome:
    """Return an outcome that fails the operation with a logged reason."""

    # The dispatcher owns logging and the terminal database transition.
    return OperationOutcome(OperationOutcomeState.fail, reason=reason)


async def execute(operation: Operation, handler: JobHandler) -> Operation:
    """Execute one claimed operation and persist the outcome that releases its lock."""

    # Claimed operations must carry the current worker lock.
    attempt_count = operation.attempt_count
    if attempt_count < 1 or operation.lease_expires_at is None:
        raise ValueError("Operation must be claimed before execution")

    logger.info("Running %s operation %s", operation.kind, operation.id)

    # Convert expected handler failures into explicit outcomes without wrapping database transitions.
    try:
        async with asyncio.timeout(OPERATION_HANDLER_TIMEOUT_SECONDS):
            outcome = await handler(operation)
    except asyncio.CancelledError:
        # Graceful shutdown unlocks the interrupted work immediately for another replica.
        await operations.defer(operation.id, attempt_count, 0)
        raise
    except TimeoutError as exc:
        detail = str(exc) or "Operation attempt timed out"
        outcome = retry(detail)
    except HTTPException as exc:
        detail = str(exc.detail)
        outcome = fail(detail)
    except Exception as exc:
        logger.exception("Operation %s failed: %r", operation.id, exc)
        outcome = retry()

    # Persist exactly one transition that releases the claimed operation.
    match outcome.state:
        case OperationOutcomeState.complete:
            updated = await operations.complete(operation.id, attempt_count)
        case OperationOutcomeState.retry:
            if attempt_count >= OPERATION_ATTEMPT_LIMIT:
                logger.error(
                    "Operation %s failed after %s attempts: %s",
                    operation.id,
                    attempt_count,
                    outcome.reason or "retry limit exceeded",
                )
                updated = await operations.fail(operation.id, attempt_count)
            else:
                if outcome.reason is not None:
                    logger.warning("Operation %s will retry: %s", operation.id, outcome.reason)
                exponent = min(attempt_count - 1, 30)
                delay = min(OPERATION_RETRY_BASE_SECONDS * (2**exponent), OPERATION_RETRY_MAX_SECONDS)
                updated = await operations.defer(operation.id, attempt_count, delay)
        case OperationOutcomeState.fail:
            logger.error("Operation %s failed: %s", operation.id, outcome.reason or "unknown reason")
            updated = await operations.fail(operation.id, attempt_count)
        case _:
            raise ValueError(f"Unsupported operation outcome '{outcome.state}'")

    # Never return a stale in-memory row when the worker could not unlock its attempt.
    if updated is None:
        raise RuntimeError(f"Operation '{operation.id}' lock was lost")

    return updated


async def run_operation_scheduler() -> None:
    """Run this replica's serial Operation worker while polling through transient failures."""

    # Keep polling after transient database failures so the worker remains available.
    while True:
        try:
            operation = await operations.claim_next()
        except Exception as exc:
            logger.exception("Operation scheduler polling failed: %r", exc)
            await asyncio.sleep(1)
            continue

        # Sleep briefly when the queue has no claimable work.
        if operation is None:
            await asyncio.sleep(1)
            continue

        logger.info("Executing %s operation %s", operation.kind, operation.id)

        # Execute and release one claimed operation before locking more work.
        try:
            result = await execute(operation, handlers[operation.kind])

            # Yield after a retry so immediately due work cannot monopolize the scheduler.
            if result.started_at is None and result.stopped_at is None:
                await asyncio.sleep(1)
        except Exception as exc:
            logger.exception("Operation scheduler failed for %s: %r", operation.id, exc)
