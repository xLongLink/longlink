from fastapi import HTTPException
from src.logger import logger
from src.models.operations import OperationStatus
from src.models.applications import AppStatus
from src.operations.applications import (delete_app, app_is_dead, app_is_ready,
                                         complete_app_creation)
from src.database.models.operation import Operation
from src.database.services.operations import operations
from src.database.services.applications import apps


async def recover_active_operations() -> None:
    """Return interrupted active operations to the queue or finish them."""

    for operation in await operations.list_active():
        payload = operation.payload or {}

        if operation.kind == "compute.setup":
            logger.info("Requeueing interrupted compute setup %s", operation.id)
            await operations.requeue(operation.id)
            continue

        if operation.kind == "app.create":
            app_id = payload.get("app_id")
            if isinstance(app_id, int):
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

        if operation.kind == "app.delete":
            app_id = payload.get("app_id")
            if isinstance(app_id, int) and await apps.get_by_id(app_id) is None:
                logger.info("Completing recovered app deletion %s", operation.id)
                if await operations.ready(operation.id) is not None:
                    await operations.complete(operation.id)
                continue

            logger.info("Requeueing interrupted app deletion %s", operation.id)
            await operations.requeue(operation.id)
            continue

        logger.warning("Failing unsupported recovered operation %s (%s)", operation.id, operation.kind)
        await operations.fail(operation.id, f"Unsupported operation '{operation.kind}' during recovery")


async def execute_claimed_operation(operation: Operation) -> Operation:
    """Execute one already-claimed operation and advance its status."""

    payload = operation.payload or {}

    try:
        if operation.kind == "compute.setup":
            from src.operations.compute import execute_compute_setup

            return await execute_compute_setup(operation)
        elif operation.kind == "app.create":
            logger.info("Running app startup verification %s", operation.id)
            return await complete_app_creation(operation)
        elif operation.kind == "app.delete":
            logger.info("Running app deletion %s", operation.id)
            await delete_app(payload["organization"], int(payload["app_id"]))
            ready = await operations.ready(operation.id)
            if ready is None:
                return operation

            completed = await operations.complete(operation.id)
            if completed is not None:
                logger.info("Completed app deletion %s", operation.id)
                return completed
        else:
            raise ValueError(f"Unsupported operation '{operation.kind}'")
    except HTTPException as exc:
        logger.warning("Operation %s failed: %s", operation.id, exc.detail)
        failed = await operations.fail(operation.id, str(exc.detail))
        if failed is not None:
            return failed

        raise
    except Exception as exc:
        logger.exception("Operation %s failed", operation.id)
        failed = await operations.fail(operation.id, str(exc))
        if failed is not None:
            return failed

        raise

    return operation


async def complete_ready_operations() -> None:
    """Complete ready operations that have already become available."""

    for operation in await operations.list():
        if operation.status != OperationStatus.ready:
            continue

        if operation.kind == "app.create" and not await app_is_ready(operation):
            continue

        logger.info("Completing ready operation %s (%s)", operation.id, operation.kind)
        await operations.complete(operation.id)
