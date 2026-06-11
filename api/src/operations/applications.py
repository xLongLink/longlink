from __future__ import annotations

import asyncio
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


async def app_is_ready(operation: Operation) -> bool:
    """Check whether one app deployment is ready."""

    app_id = operation.app_id
    if not isinstance(app_id, int):
        return False

    app = await apps.get_by_id(app_id)
    if app is None:
        return False

    org = await orgs.get(app.organization)
    if org is None:
        return False

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        return False

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    namespace = k8name(app.organization)
    # Inspect the pods for a running workload with all containers ready.
    try:
        pods = k8s._core_api.list_namespaced_pod(namespace, label_selector=f"app={app.slug}").items
    except ApiException:
        return False

    for pod in pods:
        if pod.status is None:
            continue

        statuses = pod.status.container_statuses or []
        if pod.status.phase == "Running" and statuses and all(container.ready for container in statuses):
            return True

    return False


async def app_is_dead(operation: Operation) -> bool:
    """Check whether one app deployment has already crashed."""

    app_id = operation.app_id
    if not isinstance(app_id, int):
        return False

    app = await apps.get_by_id(app_id)
    if app is None:
        return False

    org = await orgs.get(app.organization)
    if org is None:
        return False

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        return False

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    namespace = k8name(app.organization)
    # Inspect the pods for terminal phases or crash states.
    try:
        pods = k8s._core_api.list_namespaced_pod(namespace, label_selector=f"app={app.slug}").items
    except ApiException:
        return False

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
            return True

        for container in pod.status.container_statuses or []:
            state = container.state
            if state is None:
                continue

            if state.waiting is not None and state.waiting.reason in crashed_reasons:
                return True

            if state.terminated is not None and state.terminated.exit_code != 0:
                return True

    return False


async def complete_app_creation(operation: Operation) -> Operation:
    """Wait until one app starts or fails, then finalize its operation."""

    app_id = operation.app_id
    if app_id is None:
        raise ValueError("Operation missing app reference")

    app = await apps.get_by_id(app_id)
    if app is None:
        raise ValueError(f"App '{app_id}' not found")

    deadline = asyncio.get_running_loop().time() + 120.0
    # Poll until the app becomes ready, fails, or times out.
    while True:
        if await app_is_ready(operation):
            await apps.set_status(app.id, AppStatus.running)
            ready = await operations.ready(operation.id)
            if ready is None:
                return operation

            completed = await operations.complete(operation.id)
            if completed is not None:
                logger.info("Completed app creation %s", operation.id)
                return completed

            return ready

        if await app_is_dead(operation):
            await apps.set_status(app.id, AppStatus.failed)
            failed = await operations.fail(operation.id, "App crashed during startup")
            if failed is not None:
                logger.info("Failed app creation %s", operation.id)
                return failed

            return operation

        if asyncio.get_running_loop().time() >= deadline:
            await apps.set_status(app.id, AppStatus.failed)
            failed = await operations.fail(operation.id, "App did not become ready in time")
            if failed is not None:
                logger.info("Timed out app creation %s", operation.id)
                return failed

            return operation

        await asyncio.sleep(2)
