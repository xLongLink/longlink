from fastapi import HTTPException
from kubernetes.client.rest import ApiException

from src.operations.applications import create_app, delete_app
from src.logger import logger
from src.database.models import Operation, User
from src.database.services.applications import apps as apps_service
from src.database.services.compute import compute as compute_service
from src.database.services.operations import operations as operations_service
from src.database.services.organizations import orgs as orgs_service
from src.database.services.users import users as users_service
from src.models.apps import AppCreate
from src.models.operations import OperationStatus
from src.utils.namespace import k8name
from src.utils.utils import slugify


async def execute() -> None:
    """Execute queued operations and finalize ready work."""

    logger.info("Starting operation drain")
    await _recover_active_operations()

    while True:
        operation = await operations_service.claim_next()
        if operation is None:
            break

        logger.info("Executing operation %s (%s)", operation.id, operation.kind)
        try:
            await _execute_claimed_operation(operation)
        except Exception:
            # Keep draining so one failed operation does not block the queue.
            logger.exception("Operation drain failed for %s (%s)", operation.id, operation.kind)
            continue

    # Finalize any operations that only need a readiness check.
    await _complete_ready_operations()
    logger.info("Finished operation drain")


async def _recover_active_operations() -> None:
    """Return interrupted active operations to the queue or finish them."""

    for operation in await operations_service.list_active():
        payload = operation.payload or {}

        if operation.kind == "compute.setup":
            logger.info("Requeueing interrupted compute setup %s", operation.id)
            await operations_service.requeue(operation.id)
            continue

        if operation.kind == "app.create":
            organization = payload.get("organization")
            app_name = payload.get("name")
            if isinstance(organization, str) and isinstance(app_name, str):
                app = await apps_service.get(organization, slugify(app_name))
                if app is not None:
                    logger.info("Recovering completed app creation %s", operation.id)
                    await operations_service.ready(operation.id)
                    continue

            logger.info("Requeueing interrupted app creation %s", operation.id)
            await operations_service.requeue(operation.id)
            continue

        if operation.kind == "app.delete":
            app_id = payload.get("app_id")
            if isinstance(app_id, int) and await apps_service.get_by_id(app_id) is None:
                logger.info("Completing recovered app deletion %s", operation.id)
                if await operations_service.ready(operation.id) is not None:
                    await operations_service.complete(operation.id)
                continue

            logger.info("Requeueing interrupted app deletion %s", operation.id)
            await operations_service.requeue(operation.id)
            continue

        logger.warning("Failing unsupported recovered operation %s (%s)", operation.id, operation.kind)
        await operations_service.fail(operation.id, f"Unsupported operation '{operation.kind}' during recovery")


async def _execute_claimed_operation(operation: Operation) -> Operation:
    """Execute one already-claimed operation and advance its status."""

    payload = operation.payload or {}

    try:
        if operation.kind == "compute.setup":
            logger.info("Running compute setup %s", operation.id)
            registry = await compute_service.get(int(payload["registry_id"]))
            if registry is None:
                raise ValueError(f"Compute registry '{payload['registry_id']}' not found")

            from src.routes import applications as route_apps

            k8s = route_apps.K8s(registry.kubeconfig, registry.proxy_secret)
            await k8s.cleanup()
            await k8s.setup()
            ready = await operations_service.ready(operation.id)
            if ready is None:
                return operation

            completed = await operations_service.complete(operation.id)
            if completed is not None:
                logger.info("Completed compute setup %s", operation.id)
                return completed
        elif operation.kind == "app.create":
            logger.info("Running app creation %s", operation.id)
            user = None
            user_id = payload.get("user_id")
            if isinstance(user_id, int):
                user = await users_service.get_by_id(user_id)

            app_payload = AppCreate.model_validate(payload)
            await create_app(payload["organization"], app_payload, user)
            ready = await operations_service.ready(operation.id)
            if ready is not None:
                logger.info("Marked app creation ready %s", operation.id)
                return ready
        elif operation.kind == "app.delete":
            logger.info("Running app deletion %s", operation.id)
            await delete_app(payload["organization"], int(payload["app_id"]))
            ready = await operations_service.ready(operation.id)
            if ready is None:
                return operation

            completed = await operations_service.complete(operation.id)
            if completed is not None:
                logger.info("Completed app deletion %s", operation.id)
                return completed
        else:
            raise ValueError(f"Unsupported operation '{operation.kind}'")
    except HTTPException as exc:
        logger.warning("Operation %s failed: %s", operation.id, exc.detail)
        failed = await operations_service.fail(operation.id, str(exc.detail))
        if failed is not None:
            return failed

        raise
    except Exception as exc:
        logger.exception("Operation %s failed", operation.id)
        failed = await operations_service.fail(operation.id, str(exc))
        if failed is not None:
            return failed

        raise

    return operation


async def _complete_ready_operations() -> None:
    """Complete ready operations that have already become available."""

    for operation in await operations_service.list():
        if operation.status != OperationStatus.ready:
            continue

        if operation.kind == "app.create" and not await _app_is_ready(operation):
            continue

        logger.info("Completing ready operation %s (%s)", operation.id, operation.kind)
        await operations_service.complete(operation.id)


async def _app_is_ready(operation: Operation) -> bool:
    """Check whether one created app already exposes ready endpoints."""

    payload = operation.payload or {}
    organization = payload.get("organization")
    if not isinstance(organization, str):
        return False

    org = await orgs_service.get(organization)
    if org is None:
        return False

    app_name = payload.get("name")
    if not isinstance(app_name, str):
        return False

    app = await apps_service.get(organization, slugify(app_name))
    if app is None:
        return False

    registries = [registry for registry in await compute_service.list() if registry.deleted_at is None]
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        return False

    from src.routes import applications as route_apps

    k8s = route_apps.K8s(registry.kubeconfig, registry.proxy_secret)
    namespace = k8name(organization)
    try:
        endpoints = k8s._core_api.read_namespaced_endpoints(app.slug, namespace)
    except ApiException:
        return False

    return any(subset.addresses for subset in endpoints.subsets or [])
