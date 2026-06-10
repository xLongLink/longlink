from fastapi import HTTPException
from src.logger import logger
from src.utils.utils import slugify
from src.models.operations import OperationStatus
from src.models.applications import AppCreate
from src.database.models.users import User
from src.database.services.users import users
from src.operations.applications import create_app, delete_app, app_is_ready
from src.database.models.operation import Operation
from src.database.services.compute import compute
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
            organization = payload.get("organization")
            app_name = payload.get("name")
            if isinstance(organization, str) and isinstance(app_name, str):
                app = await apps.get(organization, slugify(app_name))
                if app is not None:
                    logger.info("Recovering completed app creation %s", operation.id)
                    await operations.ready(operation.id)
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
            logger.info("Running compute setup %s", operation.id)
            registry = await compute.get(int(payload["registry_id"]))
            if registry is None:
                raise ValueError(f"Compute registry '{payload['registry_id']}' not found")

            from src.adapters.compute import K8s

            k8s = K8s(registry.kubeconfig, registry.proxy_secret)
            await k8s.cleanup()
            await k8s.setup()
            ready = await operations.ready(operation.id)
            if ready is None:
                return operation

            completed = await operations.complete(operation.id)
            if completed is not None:
                logger.info("Completed compute setup %s", operation.id)
                return completed
        elif operation.kind == "app.create":
            logger.info("Running app creation %s", operation.id)
            user = None
            user_id = payload.get("user_id")
            if isinstance(user_id, int):
                user = await users.get_by_id(user_id)

            app_payload = AppCreate.model_validate(payload)
            await create_app(payload["organization"], app_payload, user)
            ready = await operations.ready(operation.id)
            if ready is not None:
                logger.info("Marked app creation ready %s", operation.id)
                return ready
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
