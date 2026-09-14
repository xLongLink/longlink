import asyncio
from uuid import UUID
from sqlmodel import col
from functools import partial
from sqlalchemy import delete, select
from src.logger import logger
from src.operations import handlers, databases
from collections.abc import Callable, Awaitable
from src.environments import env
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import DatabaseState
from src.database.models.operations import Operation
from src.database.models.organizations import Organization, OrganizationActivity


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

    # Emit stable identifiers so Grafana can follow a complete operation attempt.
    logger.info("Operation started id=%s kind=%s target_id=%s", operation.id, operation.kind, operation.target_id)

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
            logger.exception("Operation release failed id=%s kind=%s target_id=%s", operation.id, operation.kind, operation.target_id)
        logger.info("Operation cancelled id=%s kind=%s target_id=%s", operation.id, operation.kind, operation.target_id)
        raise
    except TimeoutError:
        reason = f"Operation timed out after {env.OPERATION_TIMEOUT_SECONDS} seconds"
    except Exception as exc:
        logger.exception("Operation exception id=%s kind=%s target_id=%s", operation.id, operation.kind, operation.target_id)
        reason = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__

    # Persist exactly one transition that releases the claimed operation.
    if reason is None:
        logger.info("Operation completed id=%s kind=%s target_id=%s", operation.id, operation.kind, operation.target_id)
        transition = operations.complete
    else:
        logger.error("Operation failed id=%s kind=%s target_id=%s reason=%s", operation.id, operation.kind, operation.target_id, reason)
        transition = partial(operations.fail, reason=reason)

    # Finish the terminal database transition even when shutdown cancels this worker.
    updated = await _finish_transition(transition, operation.id)

    # Never return a stale in-memory row when the worker could not finish its leased Operation.
    if updated is None:
        raise RuntimeError(f"Operation '{operation.id}' lock was lost")
    return updated


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


async def run_database_scheduler() -> None:
    """Recover database transitions and hibernate idle tenants outside the lifecycle queue."""

    # Keep independent tenant tasks across polls rather than waiting for the slowest transition.
    running: dict[UUID, asyncio.Task[None]] = {}
    limit = asyncio.Semaphore(8)

    async def reconcile(organization_id: UUID) -> None:
        """Isolate one Organization's runtime maintenance failures."""

        try:
            async with limit, asyncio.timeout(15 * 60):
                await databases.reconcile(organization_id)
        except Exception:
            logger.exception("Database maintenance failed for Organization %s", organization_id)

    async with asyncio.TaskGroup() as tasks:
        while True:
            try:
                async with session_scope() as session:
                    await session.execute(delete(OrganizationActivity).where(col(OrganizationActivity.expires_at) <= utcnow()))
                    result = await session.scalars(
                        select(col(Organization.id)).where(
                            col(Organization.deleted_at).is_(None),
                            col(Organization.status) == Status.running,
                            col(Organization.database_state) != DatabaseState.hibernated,
                        )
                    )
                    await session.commit()
                running = {organization_id: task for organization_id, task in running.items() if not task.done()}
            except Exception:
                logger.exception("Database scheduler polling failed")
                await asyncio.sleep(30)
                continue
            for organization_id in result:
                if organization_id not in running:
                    running[organization_id] = tasks.create_task(reconcile(organization_id))
            await asyncio.sleep(30)
