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
from src.database.services.applications import applications
from src.database.services.organizations import organizations


class AppStartupState(str, Enum):
    """Runtime startup states for one deployed app."""

    pending = "pending"
    ready = "ready"
    dead = "dead"


async def inspect_app_startup(operation: Operation) -> AppStartupState:
    """Inspect one app deployment startup state."""

    application_id = operation.application_id
    if application_id is None:
        return AppStartupState.pending

    application = await applications.get_by_id(application_id)
    if application is None:
        return AppStartupState.pending

    organization = await organizations.get(application.organization_id)
    if organization is None:
        return AppStartupState.pending

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max(
        (registry for registry in registries if registry.location_id == organization.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        return AppStartupState.pending

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    namespace = k8name(application.organization_id)

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = k8s._core_api.list_namespaced_pod(namespace, label_selector=f"app={application.slug}").items
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

    application_id = operation.application_id
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id)
    if application is None:
        raise ValueError(f"Application '{application_id}' not found")

    if operation.step != "verify":
        raise ValueError(f"Unsupported app.create step '{operation.step}'")

    startup_state = await inspect_app_startup(operation)
    if startup_state == AppStartupState.ready:
        await applications.set_status(application.id, AppStatus.running)
        completed = await operations.complete(operation.id)
        if completed is not None:
            logger.info("Completed app creation %s", operation.id)
            return completed

        return operation

    if startup_state == AppStartupState.dead:
        await applications.set_status(application.id, AppStatus.failed)
        failed = await operations.fail(operation.id, "App crashed during startup")
        if failed is not None:
            logger.info("Failed app creation %s", operation.id)
            return failed

        return operation

    deferred = await operations.defer(operation.id)
    return deferred or operation


async def execute_app_delete(operation: Operation) -> Operation:
    """Run one app deletion step."""

    application_id = operation.application_id
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id)
    if application is None:
        completed = await operations.complete(operation.id)
        return completed or operation

    if operation.step != "remove_runtime":
        raise ValueError(f"Unsupported app.delete step '{operation.step}'")

    organization = await organizations.get(application.organization_id)
    if organization is None:
        raise ValueError(f"Organization '{application.organization_id}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max(
        (registry for registry in registries if registry.location_id == organization.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise ValueError(f"No compute cluster configured for location '{organization.location_id}'")

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    await k8s.remove(application.organization_id, application.slug)
    try:
        await applications.delete(application.organization_id, application.id)
    except ValueError as exc:
        if str(exc) != "Application not found":
            raise

    completed = await operations.complete(operation.id)
    if completed is not None:
        logger.info("Completed app deletion %s", operation.id)
        return completed

    return operation
