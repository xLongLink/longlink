import asyncio
import logging
from uuid import UUID
from functools import partial
from src.logger import logger
from contextvars import ContextVar
from src.operations import handlers
from collections.abc import Callable, Awaitable
from src.environments import env
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import operations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.operations import Operation

operation_id: ContextVar[UUID | None] = ContextVar("operation_id", default=None)
OPERATION_LOG_CLEANUP_SECONDS = 86400


class OperationLogHandler(logging.Handler):
    """Collect log records emitted while one Operation is executing."""

    def __init__(self, expected_operation_id: UUID) -> None:
        """Initialize an empty log collector for one Operation."""

        super().__init__()
        self.logs: list[str] = []
        self.expected_operation_id = expected_operation_id

    def emit(self, record: logging.LogRecord) -> None:
        """Store records produced by this handler's active Operation."""

        # Ignore concurrent request and scheduler log records.
        if operation_id.get() != self.expected_operation_id:
            return

        self.logs.append(self.format(record))


async def _finish_transition(
    transition: Callable[[AsyncSession, UUID], Awaitable[Operation | None]], operation_id: UUID
) -> Operation | None:
    """Finish one terminal transition before propagating worker cancellation."""

    # Run persistence independently so repeated cancellation cannot interrupt it.
    async def persist() -> Operation | None:
        """Persist one terminal transition in a fresh transaction."""

        async with session_scope() as session:
            updated = await transition(session, operation_id)
            await session.commit()
            return updated

    task = asyncio.create_task(persist())
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


async def execute(operation: Operation) -> Operation:
    """Execute one claimed operation and persist the outcome that releases its lock."""

    # Claimed operations must carry a live worker lock.
    if operation.lease_expires_at is None or operation.lease_expires_at <= utcnow():
        raise ValueError("Operation must be claimed before execution")

    # Capture the operation's existing structured log output until its terminal state is persisted.
    log_handler = OperationLogHandler(operation.id)
    log_handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    token = operation_id.set(operation.id)
    logger.addHandler(log_handler)

    try:
        # Record the target before dispatch so registration and handler failures share one diagnostic path.
        logger.info("Running %s operation %s", operation.kind, operation.id)

        # Bound one complete handler execution under its worker lease.
        try:
            async with asyncio.timeout(env.OPERATION_TIMEOUT_SECONDS):
                handler = handlers[operation.kind]
                reason = await handler(operation.target_id)
        except asyncio.CancelledError:
            # Graceful shutdown leaves interrupted work available for the next scheduler.
            try:
                await _finish_transition(operations.release, operation.id)
            except Exception:
                logger.exception("Could not release cancelled Operation %s", operation.id)
            raise
        except TimeoutError:
            reason = f"Operation timed out after {env.OPERATION_TIMEOUT_SECONDS} seconds"
        except Exception as exc:
            logger.exception("Operation %s failed", operation.id)
            reason = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__

        # Persist exactly one transition that releases the claimed operation.
        if reason is None:
            logger.info("Operation %s completed", operation.id)
            transition = partial(operations.complete, logs=log_handler.logs)
        else:
            logger.error("Operation %s failed: %s", operation.id, reason)
            transition = partial(operations.fail, reason=reason, logs=log_handler.logs)

        # Finish the terminal database transition even when shutdown cancels this worker.
        updated = await _finish_transition(transition, operation.id)

        # Never return a stale in-memory row when the worker could not finish its leased Operation.
        if updated is None:
            raise RuntimeError(f"Operation '{operation.id}' lock was lost")

        return updated
    finally:
        logger.removeHandler(log_handler)
        operation_id.reset(token)


async def run_operation_scheduler() -> None:
    """Run this replica's serial Operation worker while polling through scheduler failures."""

    # Keep polling after transient database failures so the worker remains available.
    while True:
        operation: Operation | None = None
        try:
            async with session_scope() as session:
                operation = await operations.claim(session)
                await session.commit()
        except Exception:
            logger.exception("Operation scheduler polling failed")

        # Sleep briefly when the queue has no claimable work.
        if operation is None:
            await asyncio.sleep(1)
            continue

        # Execute and release one claimed operation before locking more work.
        try:
            await execute(operation)
        except Exception:
            logger.exception("Operation scheduler failed for %s", operation.id)


async def run_operation_log_cleanup() -> None:
    """Clear logs retained beyond the Operation diagnostic window."""

    while True:
        # Clear expired payloads without removing their Operation history.
        try:
            async with session_scope() as session:
                cleared = await operations.clear_expired_logs(session)
                await session.commit()
            if cleared > 0:
                logger.info("Cleared logs for %s expired Operations", cleared)
        except Exception:
            logger.exception("Operation log cleanup failed")

        await asyncio.sleep(OPERATION_LOG_CLEANUP_SECONDS)
