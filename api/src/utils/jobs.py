import asyncio
import contextlib
from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime
from functools import partial
from src.operations import handlers
from collections.abc import Callable, Awaitable
from src.database.session import session_scope
from src.database.services import users, operations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.operations import Operation

OPERATION_TIMEOUT_SECONDS = 180


async def _finish_transition(transition: Callable[[AsyncSession, UUID], Awaitable[bool]], operation_id: UUID) -> bool:
    """Finish one terminal transition before propagating worker cancellation."""

    # Run persistence independently so repeated cancellation cannot interrupt it.
    async def persist() -> bool:
        """Persist one terminal transition in a fresh transaction."""

        async with session_scope() as session:
            updated = await transition(session, operation_id)
            await session.commit()
            return updated

    task = asyncio.create_task(persist())
    cancelled = False

    # Finish the persistence transition even when its caller is cancelled.
    while not task.done():
        try:
            await asyncio.wait({task})

        # Remember cancellation while allowing the protected persistence task to finish.
        except asyncio.CancelledError:
            cancelled = True

    # Preserve shutdown after the terminal database transition finishes.
    if cancelled:
        if not task.cancelled():
            task.exception()
        raise asyncio.CancelledError
    return task.result()


async def execute(operation: Operation) -> None:
    """Execute one claimed operation and persist the outcome that releases its lock."""

    # Claimed operations must carry a live worker lock.
    if operation.lease_expires_at is None or operation.lease_expires_at <= datetime.now(UTC):
        raise ValueError("Operation must be claimed before execution")

    # Bound one complete handler execution under its worker lease.
    try:
        async with asyncio.timeout(OPERATION_TIMEOUT_SECONDS):
            await handlers[operation.kind](operation.target_id)

    # Graceful shutdown leaves interrupted work available for the next scheduler.
    except asyncio.CancelledError:
        with contextlib.suppress(Exception):
            await _finish_transition(operations.release, operation.id)
        raise

    # Timeouts are terminal handler failures with a bounded queue-visible reason.
    except TimeoutError:
        reason = f"Operation timed out after {OPERATION_TIMEOUT_SECONDS} seconds"

    # Persist only the public error detail, not the exception representation.
    except HTTPException as exc:
        reason = str(exc.detail)
    except Exception as exc:
        message = str(exc)
        reason = f"{type(exc).__name__}: {message}" if message else type(exc).__name__

    # Successful handlers clear any prior failure reason.
    else:
        reason = None

    # Persist exactly one transition that releases the claimed operation.
    if reason is None:
        transition = operations.complete
    else:
        transition = partial(operations.fail, reason=reason)

    # Finish the terminal database transition even when shutdown cancels this worker.
    updated = await _finish_transition(transition, operation.id)

    # Reject completion when the worker no longer owns its leased Operation.
    if not updated:
        raise RuntimeError(f"Operation '{operation.id}' lock was lost")


async def run_operation_scheduler() -> None:
    """Run this replica's serial Operation worker while polling through scheduler failures."""

    # Keep polling after transient failures so the worker remains available.
    while True:
        try:

            # Publish the lease before dispatching work outside the transaction.
            async with session_scope() as session:
                operation = await operations.claim(session)
                await session.commit()

            # Sleep briefly when the queue has no claimable work.
            if operation is None:
                await asyncio.sleep(1)
                continue

            # Execute and release one claimed operation before locking more work.
            await execute(operation)

        # Startup retries transient database failures without terminating the API.
        except Exception:

            # Back off before retrying administrator initialization.
            await asyncio.sleep(1)


async def run_administrator_reconciler() -> None:
    """Reconcile the Platform administrator after the database becomes available."""

    # Retry database initialization without delaying process startup and static route serving.
    while True:
        try:

            # Retry initialization until the configured administrator is persisted.
            async with session_scope() as session:
                await users.ensure_administrator(session)
                await session.commit()

            return

        # Keep startup alive while administrator persistence is temporarily unavailable.
        except Exception:
            await asyncio.sleep(1)
