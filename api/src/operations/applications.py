from __future__ import annotations

from enum import Enum
from src.logger import logger
from src.utils.namespace import k8name
from src.adapters.compute import K8s
from kubernetes.client.rest import ApiException
from src.models.applications import AppStatus
from src.database.models.operation import Operation
from src.database.services.compute import compute
from src.database.services.operations import operations
from src.database.services.applications import apps
from src.database.services.organizations import orgs


class AppStartupState(str, Enum):
    """Runtime startup states for one deployed app."""

    pending = "pending"
    ready = "ready"
    dead = "dead"


async def inspect_app_startup(operation: Operation) -> AppStartupState:
    """Inspect one app deployment startup state."""

    app_id = operation.app_id
    if app_id is None:
        return AppStartupState.pending

    app = await apps.get_by_id(app_id)
    if app is None:
        return AppStartupState.pending

    org = await orgs.get(app.organization_id)
    if org is None:
        return AppStartupState.pending

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max(
        (registry for registry in registries if registry.location_id == org.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        return AppStartupState.pending

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    namespace = k8name(app.organization_id)

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = k8s._core_api.list_namespaced_pod(namespace, label_selector=f"app={app.slug}").items
    except ApiException:
        return AppStartupState.pending

    crashed_reasons = {
        "CrashLoopBackOff",
        "CreateContainerConfigError",
        "ErrImagePull",
        "ImagePullBackOff",
        "RunContainerError",
    }

    for pod in pods:
        if pod.status is None:
            continue

        if pod.status.phase in {"Failed", "Unknown"}:
            return AppStartupState.dead

        statuses = pod.status.container_statuses or []
        if pod.status.phase == "Running" and statuses and all(container.ready for container in statuses):
            return AppStartupState.ready

        for container in pod.status.container_statuses or []:
            state = container.state
            if state is None:
                continue

            if state.waiting is not None and state.waiting.reason in crashed_reasons:
                return AppStartupState.dead

            if state.terminated is not None and state.terminated.exit_code != 0:
                return AppStartupState.dead

    return AppStartupState.pending


async def execute_app_create(operation: Operation) -> Operation:
    """Run one app creation verification step."""

    app_id = operation.app_id
    if app_id is None:
        raise ValueError("Operation missing app reference")

    app = await apps.get_by_id(app_id)
    if app is None:
        raise ValueError(f"App '{app_id}' not found")

    if operation.step != "verify":
        raise ValueError(f"Unsupported app.create step '{operation.step}'")

    startup_state = await inspect_app_startup(operation)
    if startup_state == AppStartupState.ready:
        await apps.set_status(app.id, AppStatus.running)
        completed = await operations.complete(operation.id)
        if completed is not None:
            logger.info("Completed app creation %s", operation.id)
            return completed

        return operation

    if startup_state == AppStartupState.dead:
        await apps.set_status(app.id, AppStatus.failed)
        failed = await operations.fail(operation.id, "App crashed during startup")
        if failed is not None:
            logger.info("Failed app creation %s", operation.id)
            return failed

        return operation

    deferred = await operations.defer(operation.id)
    return deferred or operation


async def execute_app_delete(operation: Operation) -> Operation:
    """Run one app deletion step."""

    app_id = operation.app_id
    if app_id is None:
        raise ValueError("Operation missing app reference")

    app = await apps.get_by_id(app_id)
    if app is None:
        completed = await operations.complete(operation.id)
        return completed or operation

    if operation.step != "remove_runtime":
        raise ValueError(f"Unsupported app.delete step '{operation.step}'")

    org = await orgs.get(app.organization_id)
    if org is None:
        raise ValueError(f"Org '{app.organization_id}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max(
        (registry for registry in registries if registry.location_id == org.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise ValueError(f"No compute cluster configured for location '{org.location_id}'")

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    await k8s.remove(app.organization_id, app.slug)
    try:
        await apps.delete(app.organization_id, app.id)
    except ValueError as exc:
        if str(exc) != "App not found":
            raise

    completed = await operations.complete(operation.id)
    if completed is not None:
        logger.info("Completed app deletion %s", operation.id)
        return completed

    return operation
