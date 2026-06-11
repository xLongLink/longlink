from fastapi import HTTPException
from src.logger import logger
from src.models.operations import OperationStatus
from src.models.applications import AppStatus
from src.operations.applications import app_is_dead, app_is_ready, complete_app_creation
from src.database.models.operation import Operation
from src.database.services.operations import operations
from src.database.services.applications import apps


async def recover_active_operations() -> None:
    """Return interrupted active operations to the queue or finish them."""

    # Walk active operations one by one so each kind can recover independently.
    for operation in await operations.list_active():
        # Compute setup can always be replayed from scratch.
        if operation.kind == "compute.setup":
            logger.info("Requeueing interrupted compute setup %s", operation.id)
            await operations.requeue(operation.id)
            continue

        # App creation can be completed or failed based on the stored app state.
        if operation.kind == "app.create":
            app_id = operation.app_id
            if app_id is None:
                logger.warning("Failing app creation %s without app reference", operation.id)
                await operations.fail(operation.id, "Operation missing app reference")
                continue

            app = await apps.get_by_id(app_id)
            if app is not None and app.status == AppStatus.running:
                logger.info("Recovering completed app creation %s", operation.id)
                await operations.ready(operation.id)
                await operations.complete(operation.id)
                continue

            if app is not None and app.status == AppStatus.failed:
                logger.info("Failing recovered app creation %s", operation.id)
                await operations.fail(operation.id, "App failed during startup")
                continue

            logger.info("Requeueing interrupted app creation %s", operation.id)
            await operations.requeue(operation.id)
            continue

        # Fail anything the recovery flow does not understand.
        logger.warning("Failing unsupported recovered operation %s (%s)", operation.id, operation.kind)
        await operations.fail(operation.id, f"Unsupported operation '{operation.kind}' during recovery")


async def execute_claimed_operation(operation: Operation) -> Operation:
    """Execute one already-claimed operation and advance its status."""

    try:
        # Dispatch each operation kind to its dedicated executor.
        if operation.kind == "compute.setup":
            from src.operations.compute import execute_compute_setup

            return await execute_compute_setup(operation)
        elif operation.kind == "app.create":
            logger.info("Running app startup verification %s", operation.id)
            return await complete_app_creation(operation)
        else:
            raise ValueError(f"Unsupported operation '{operation.kind}'")
    except HTTPException as exc:
        # Convert API-layer failures into operation failures without hiding the original message.
        logger.warning("Operation %s failed: %s", operation.id, exc.detail)
        failed = await operations.fail(operation.id, str(exc.detail))
        if failed is not None:
            return failed

        raise
    except Exception as exc:
        # Preserve unexpected errors as failed operations when the database update succeeds.
        logger.exception("Operation %s failed", operation.id)
        failed = await operations.fail(operation.id, str(exc))
        if failed is not None:
            return failed

        raise

    return operation


async def complete_ready_operations() -> None:
    """Complete ready operations that have already become available."""

    # Finalize only operations that are already marked ready in the database.
    for operation in await operations.list():
        if operation.status != OperationStatus.ready:
            continue

        # App creation still needs the runtime readiness probe before completion.
        if operation.kind == "app.create" and not await app_is_ready(operation):
            continue

        logger.info("Completing ready operation %s (%s)", operation.id, operation.kind)
        await operations.complete(operation.id)
