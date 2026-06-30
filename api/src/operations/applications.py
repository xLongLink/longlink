from enum import Enum
from src.logger import logger
from src.operations import provisioning
from src.models.statuses import ApplicationStatus
from src.adapters.compute import K8s
from src.models.operations import OperationKind
from src.operations.registry import operation_handler
from kubernetes.client.exceptions import ApiException as KubernetesApiException
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

    registry = await provisioning.application_compute_registry(application, organization.location_id)
    if registry is None:
        return ApplicationStartupState.pending

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = k8s.application_pods(organization.slug, application.slug)
    except KubernetesApiException:
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

    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

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
        completed = await operations.complete(operation.id, operation.lease_token)
        if completed is not None:
            logger.info("Completed application creation %s", operation.id)
            return completed

        return operation

    if startup_state == ApplicationStartupState.dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        failed = await operations.fail(operation.id, "Application crashed during startup", operation.lease_token)
        if failed is not None:
            logger.info("Failed application creation %s", operation.id)
            return failed

        return operation

    deferred = await operations.defer(operation.id, operation.lease_token)
    return deferred or operation


@operation_handler(OperationKind.application_delete, step="remove_runtime")
async def execute_application_delete(operation: Operation) -> Operation:
    """Run one application deletion step."""

    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    application_id = operation.application_id
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id)
    if application is None:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    if operation.step != "remove_runtime":
        raise ValueError(f"Unsupported application delete step '{operation.step}'")

    organization = await organizations.get(application.organization_id)
    if organization is None:
        raise ValueError(f"Organization '{application.organization_id}' not found")

    await provisioning.delete_application_runtime(application, organization)
    try:
        await applications.delete(application.organization_id, application.id, deleted_id=operation.created_id)
    except ValueError as exc:
        if str(exc) != "Application not found":
            raise

    completed = await operations.complete(operation.id, operation.lease_token)
    if completed is not None:
        logger.info("Completed application deletion %s", operation.id)
        return completed

    return operation
