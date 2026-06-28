from enum import Enum
from src.logger import logger
from src.adapters.compute import K8s
from src.models.operations import OperationKind
from kubernetes.client.rest import ApiException
from src.models.applications import ApplicationStatus
from src.operations.registry import operation_handler
from src.database.services.compute import compute
from src.database.models.operations import Operation
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations


class ApplicationStartupState(str, Enum):
    """Runtime startup states for one deployed application."""

    pending = "pending"
    ready = "ready"
    dead = "dead"


async def inspect_application_startup(operation: Operation) -> ApplicationStartupState:
    """Inspect one application deployment startup state."""

    application_id = operation.application_id
    if application_id is None:
        return ApplicationStartupState.pending

    application = await applications.get_by_id(application_id)
    if application is None:
        return ApplicationStartupState.pending

    organization = await organizations.get(application.organization_id)
    if organization is None:
        return ApplicationStartupState.pending

    registries = await compute.list()
    registry = max(
        (registry for registry in registries if registry.location_id == organization.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        return ApplicationStartupState.pending

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = k8s.application_pods(organization.slug, application.slug)
    except ApiException:
        return ApplicationStartupState.pending

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
            return ApplicationStartupState.dead

        statuses = pod.status.container_statuses or []
        if pod.status.phase == "Running" and statuses and all(container.ready for container in statuses):
            return ApplicationStartupState.ready

        for container in pod.status.container_statuses or []:
            state = container.state
            if state is None:
                continue

            if state.waiting is not None and state.waiting.reason in crashed_reasons:
                return ApplicationStartupState.dead

            if state.terminated is not None and state.terminated.exit_code != 0:
                return ApplicationStartupState.dead

    return ApplicationStartupState.pending


@operation_handler(OperationKind.application_create, step="verify")
async def execute_application_create(operation: Operation) -> Operation:
    """Run one application creation verification step."""

    application_id = operation.application_id
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id)
    if application is None:
        raise ValueError(f"Application '{application_id}' not found")

    if operation.step != "verify":
        raise ValueError(f"Unsupported application create step '{operation.step}'")

    startup_state = await inspect_application_startup(operation)
    if startup_state == ApplicationStartupState.ready:
        await applications.set_status(application.id, ApplicationStatus.running)
        completed = await operations.complete(operation.id)
        if completed is not None:
            logger.info("Completed application creation %s", operation.id)
            return completed

        return operation

    if startup_state == ApplicationStartupState.dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        failed = await operations.fail(operation.id, "Application crashed during startup")
        if failed is not None:
            logger.info("Failed application creation %s", operation.id)
            return failed

        return operation

    deferred = await operations.defer(operation.id)
    return deferred or operation


@operation_handler(OperationKind.application_delete, step="remove_runtime")
async def execute_application_delete(operation: Operation) -> Operation:
    """Run one application deletion step."""

    application_id = operation.application_id
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id)
    if application is None:
        completed = await operations.complete(operation.id)
        return completed or operation

    if operation.step != "remove_runtime":
        raise ValueError(f"Unsupported application delete step '{operation.step}'")

    organization = await organizations.get(application.organization_id)
    if organization is None:
        raise ValueError(f"Organization '{application.organization_id}' not found")

    registries = await compute.list()
    registry = max(
        (registry for registry in registries if registry.location_id == organization.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise ValueError(f"No compute cluster configured for location '{organization.location_id}'")

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    await k8s.remove(organization.slug, application.slug)
    try:
        await applications.delete(application.organization_id, application.id, deleted_id=operation.created_id)
    except ValueError as exc:
        if str(exc) != "Application not found":
            raise

    completed = await operations.complete(operation.id)
    if completed is not None:
        logger.info("Completed application deletion %s", operation.id)
        return completed

    return operation
