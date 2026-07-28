import asyncio
from fastapi import HTTPException
from src.logger import logger
from collections.abc import Callable, Awaitable, Coroutine
from longlink.utils.time import utcnow
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.operations import Operation

OPERATION_HANDLER_TIMEOUT_SECONDS = 20 * 60


JobHandler = Callable[[Operation], Awaitable[str | None]]

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


async def _finish_transition(transition: Coroutine[object, object, Operation | None]) -> Operation | None:
    """Finish one terminal transition before propagating worker cancellation."""

    # Run persistence independently so repeated cancellation cannot interrupt it.
    task = asyncio.create_task(transition)
    cancelled = False
    while True:
        try:
            updated = await asyncio.shield(task)
        except asyncio.CancelledError:
            cancelled = True
            continue
        except Exception:
            if cancelled:
                logger.exception("Terminal Operation transition failed during cancellation")
                raise asyncio.CancelledError from None
            raise
        break

    # Preserve shutdown after the terminal database transition finishes.
    if cancelled:
        raise asyncio.CancelledError
    return updated


async def execute(operation: Operation, handler: JobHandler) -> Operation:
    """Execute one claimed operation and persist the outcome that releases its lock."""

    # Claimed operations must carry a live worker lock.
    if operation.lease_expires_at is None or operation.lease_expires_at <= utcnow():
        raise ValueError("Operation must be claimed before execution")

    logger.info("Running %s operation %s", operation.kind, operation.id)

    # Bound one complete handler execution under its worker lease.
    try:
        async with asyncio.timeout(OPERATION_HANDLER_TIMEOUT_SECONDS):
            reason = await handler(operation)
    except asyncio.CancelledError:
        # Graceful shutdown makes interrupted single-execution work terminal.
        try:
            await _finish_transition(operations.fail(operation.id))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("Could not fail cancelled Operation %s: %r", operation.id, exc)
        raise
    except TimeoutError:
        reason = "Operation timed out"
    except HTTPException as exc:
        detail = str(exc.detail)
        reason = detail
    except Exception as exc:
        logger.exception("Operation %s failed: %r", operation.id, exc)
        reason = str(exc) or type(exc).__name__

    # Persist exactly one transition that releases the claimed operation.
    if reason is None:
        transition = operations.complete(operation.id)
    else:
        logger.error("Operation %s failed: %s", operation.id, reason)
        transition = operations.fail(operation.id)

    # Finish the terminal database transition even when shutdown cancels this worker.
    updated = await _finish_transition(transition)

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

        # Execute and release one claimed operation before locking more work.
        try:
            await execute(operation, handlers[operation.kind])
        except Exception as exc:
            logger.exception("Operation scheduler failed for %s: %r", operation.id, exc)
