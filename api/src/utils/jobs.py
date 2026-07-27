import asyncio
from enum import StrEnum
from fastapi import HTTPException
from src.logger import logger
from dataclasses import dataclass
from collections.abc import Callable, Awaitable
from longlink.utils.time import utcnow
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.operations import Operation

OPERATION_HANDLER_TIMEOUT_SECONDS = 20 * 60


class OperationOutcomeState(StrEnum):
    """Supported results from one operation handler execution."""

    complete = "complete"
    fail = "fail"
    waiting = "waiting"


@dataclass(frozen=True)
class OperationOutcome:
    """Represent the requested state transition during handler execution."""

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


def wait(reason: str) -> OperationOutcome:
    """Keep one claimed operation waiting for external convergence."""

    # The dispatcher polls the same idempotent handler without releasing its lease.
    return OperationOutcome(OperationOutcomeState.waiting, reason=reason)


def fail(reason: str) -> OperationOutcome:
    """Return an outcome that fails the operation with a logged reason."""

    # The dispatcher owns logging and the terminal database transition.
    return OperationOutcome(OperationOutcomeState.fail, reason=reason)


async def execute(operation: Operation, handler: JobHandler) -> Operation:
    """Execute one claimed operation and persist the outcome that releases its lock."""

    # Claimed operations must carry a live worker lock.
    if operation.lease_expires_at is None or operation.lease_expires_at <= utcnow():
        raise ValueError("Operation must be claimed before execution")

    logger.info("Running %s operation %s", operation.kind, operation.id)

    # Wait for normal external convergence within this one claimed execution.
    waiting_reason: str | None = None
    try:
        async with asyncio.timeout(OPERATION_HANDLER_TIMEOUT_SECONDS):
            while True:
                outcome = await handler(operation)
                if outcome.state != OperationOutcomeState.waiting:
                    break
                if outcome.reason != waiting_reason:
                    waiting_reason = outcome.reason
                    logger.info("Operation %s is waiting: %s", operation.id, waiting_reason)
                await asyncio.sleep(5)
    except asyncio.CancelledError:
        # Graceful shutdown makes interrupted single-execution work terminal.
        await operations.fail(operation.id)
        raise
    except TimeoutError:
        detail = "Operation timed out"
        if waiting_reason is not None:
            detail = f"{detail} while waiting: {waiting_reason}"
        outcome = fail(detail)
    except HTTPException as exc:
        detail = str(exc.detail)
        outcome = fail(detail)
    except Exception as exc:
        logger.exception("Operation %s failed: %r", operation.id, exc)
        outcome = fail(str(exc) or type(exc).__name__)

    # Persist exactly one transition that releases the claimed operation.
    match outcome.state:
        case OperationOutcomeState.complete:
            updated = await operations.complete(operation.id)
        case OperationOutcomeState.fail:
            logger.error("Operation %s failed: %s", operation.id, outcome.reason or "unknown reason")
            updated = await operations.fail(operation.id)
        case _:
            raise ValueError(f"Unsupported operation outcome '{outcome.state}'")

    # Never return a stale in-memory row when the worker could not finish its leased Operation.
    if updated is None:
        raise RuntimeError(f"Operation '{operation.id}' lock was lost")

    return updated


async def run_operation_scheduler() -> None:
    """Run this replica's serial Operation worker while polling through scheduler failures."""

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
            await execute(operation, handlers[operation.kind])
        except Exception as exc:
            logger.exception("Operation scheduler failed for %s: %r", operation.id, exc)
