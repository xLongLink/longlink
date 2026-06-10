import src.db as db
from fastapi import HTTPException
from kubernetes.client.rest import ApiException

from src.operations.applications import create_app, delete_app
from src.models.apps import AppCreate
from src.models.operations import OperationStatus
from src.utils.namespace import k8name
from src.utils.utils import slugify


async def execute() -> None:
    """Execute queued operations and finalize ready work."""

    await _recover_active_operations()

    while True:
        operation = await db.operations.claim_next()
        if operation is None:
            break

        try:
            await _execute_claimed_operation(operation)
        except Exception:
            # Keep draining so one failed operation does not block the queue.
            continue

    # Finalize any operations that only need a readiness check.
    await _complete_ready_operations()


async def _recover_active_operations() -> None:
    """Return interrupted active operations to the queue or finish them."""

    for operation in await db.operations.list_active():
        payload = operation.payload or {}

        if operation.kind == "compute.setup":
            await db.operations.requeue(operation.id)
            continue

        if operation.kind == "app.create":
            organization = payload.get("organization")
            app_name = payload.get("name")
            if isinstance(organization, str) and isinstance(app_name, str):
                app = await db.apps.get(organization, slugify(app_name))
                if app is not None:
                    await db.operations.ready(operation.id)
                    continue

            await db.operations.requeue(operation.id)
            continue

        if operation.kind == "app.delete":
            app_id = payload.get("app_id")
            if isinstance(app_id, int) and await db.apps.get_by_id(app_id) is None:
                if await db.operations.ready(operation.id) is not None:
                    await db.operations.complete(operation.id)
                continue

            await db.operations.requeue(operation.id)
            continue

        await db.operations.fail(operation.id, f"Unsupported operation '{operation.kind}' during recovery")


async def _execute_claimed_operation(operation: db.Operation) -> db.Operation:
    """Execute one already-claimed operation and advance its status."""

    payload = operation.payload or {}

    try:
        if operation.kind == "compute.setup":
            registry = await db.compute.get(int(payload["registry_id"]))
            if registry is None:
                raise ValueError(f"Compute registry '{payload['registry_id']}' not found")

            from src.routes import apps as route_apps

            compute = route_apps.K8s(registry.kubeconfig, registry.proxy_secret)
            await compute.cleanup()
            await compute.setup()
            ready = await db.operations.ready(operation.id)
            if ready is None:
                return operation

            completed = await db.operations.complete(operation.id)
            if completed is not None:
                return completed
        elif operation.kind == "app.create":
            user = None
            user_id = payload.get("user_id")
            if isinstance(user_id, int):
                user = await db.users.get_by_id(user_id)

            app_payload = AppCreate.model_validate(payload)
            await create_app(payload["organization"], app_payload, user)
            ready = await db.operations.ready(operation.id)
            if ready is not None:
                return ready
        elif operation.kind == "app.delete":
            await delete_app(payload["organization"], int(payload["app_id"]))
            ready = await db.operations.ready(operation.id)
            if ready is None:
                return operation

            completed = await db.operations.complete(operation.id)
            if completed is not None:
                return completed
        else:
            raise ValueError(f"Unsupported operation '{operation.kind}'")
    except HTTPException as exc:
        failed = await db.operations.fail(operation.id, str(exc.detail))
        if failed is not None:
            return failed

        raise
    except Exception as exc:
        failed = await db.operations.fail(operation.id, str(exc))
        if failed is not None:
            return failed

        raise

    return operation


async def _complete_ready_operations() -> None:
    """Complete ready operations that have already become available."""

    for operation in await db.operations.list():
        if operation.status != OperationStatus.ready:
            continue

        if operation.kind == "app.create" and not await _app_is_ready(operation):
            continue

        await db.operations.complete(operation.id)


async def _app_is_ready(operation: db.Operation) -> bool:
    """Check whether one created app already exposes ready endpoints."""

    payload = operation.payload or {}
    organization = payload.get("organization")
    if not isinstance(organization, str):
        return False

    org = await db.orgs.get(organization)
    if org is None:
        return False

    app_name = payload.get("name")
    if not isinstance(app_name, str):
        return False

    app = await db.apps.get(organization, slugify(app_name))
    if app is None:
        return False

    registries = [registry for registry in await db.compute.list() if registry.deleted_at is None]
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        return False

    from src.routes import apps as route_apps

    compute = route_apps.K8s(registry.kubeconfig, registry.proxy_secret)
    namespace = k8name(organization)
    try:
        endpoints = compute._core_api.read_namespaced_endpoints(app.slug, namespace)
    except ApiException:
        return False

    return any(subset.addresses for subset in endpoints.subsets or [])
