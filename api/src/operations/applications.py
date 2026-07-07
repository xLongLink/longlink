from enum import Enum
from typing import Any
from datetime import UTC, datetime, timedelta
from src import adapters
from src.logger import logger
from src.operations import provisioning
from src.models.statuses import ApplicationStatus
from src.models.operations import OperationKind
from src.operations.registry import operation_handler
from kubernetes.client.exceptions import ApiException as KubernetesApiException
from src.database.models.operations import Operation
from src.database.services import operations
from src.database.services import applications
from src.database.services import organizations


class ApplicationStartupState(str, Enum):
    """Runtime startup states for one deployed application."""

    pending = "pending"
    ready = "ready"
    dead = "dead"


POD_ROLLOUT_GRACE_SECONDS = 30
APPLICATION_VERIFICATION_TIMEOUT_SECONDS = 15 * 60
FAILED_CONTAINER_WAITING_REASONS = {
    "CrashLoopBackOff",
    "CreateContainerConfigError",
    "CreateContainerError",
    "ErrImagePull",
    "ImagePullBackOff",
    "InvalidImageName",
    "RunContainerError",
}


def application_verification_timed_out(operation_created_at: datetime) -> bool:
    """Return whether application startup verification has exceeded its retry window."""

    if operation_created_at.tzinfo is None:
        operation_created_at = operation_created_at.replace(tzinfo=UTC)

    return datetime.now(UTC) - operation_created_at >= timedelta(seconds=APPLICATION_VERIFICATION_TIMEOUT_SECONDS)


def application_pods_startup_state(pods: list[Any], operation_created_at: datetime) -> ApplicationStartupState:
    """Return the startup state for pods relevant to one verification operation."""

    if operation_created_at.tzinfo is None:
        operation_created_at = operation_created_at.replace(tzinfo=UTC)

    relevant_created_after = operation_created_at - timedelta(seconds=POD_ROLLOUT_GRACE_SECONDS)
    relevant_pods = []

    # Ignore stale pods from older rollouts so they cannot fail a fresh verification operation.
    for pod in pods:
        metadata = getattr(pod, "metadata", None)
        pod_created_at = getattr(metadata, "creation_timestamp", None)
        if pod_created_at is None:
            relevant_pods.append(pod)
            continue

        if pod_created_at.tzinfo is None:
            pod_created_at = pod_created_at.replace(tzinfo=UTC)

        if pod_created_at >= relevant_created_after:
            relevant_pods.append(pod)

    if not relevant_pods:
        return ApplicationStartupState.pending

    ready_pods = 0
    for pod in relevant_pods:
        status = getattr(pod, "status", None)
        if status is None:
            continue

        container_statuses = getattr(status, "container_statuses", None) or []
        if (
            status.phase == "Running"
            and container_statuses
            and all(container.ready for container in container_statuses)
        ):
            ready_pods += 1

    if ready_pods == len(relevant_pods):
        return ApplicationStartupState.ready

    dead_pods = 0
    for pod in relevant_pods:
        status = getattr(pod, "status", None)
        if status is None:
            continue

        if status.phase in {"Failed", "Unknown"}:
            dead_pods += 1
            continue

        pod_dead = False
        for container in getattr(status, "container_statuses", None) or []:
            state = container.state
            if state is None:
                continue

            if state.waiting is not None and state.waiting.reason in FAILED_CONTAINER_WAITING_REASONS:
                pod_dead = True

            if state.terminated is not None and state.terminated.exit_code != 0:
                pod_dead = True

        if pod_dead:
            dead_pods += 1

    if dead_pods == len(relevant_pods):
        return ApplicationStartupState.dead

    return ApplicationStartupState.pending


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

    compute_adapter = adapters.compute(registry)

    try:
        if compute_adapter.application_deployment_ready(organization.slug, application.slug):
            return ApplicationStartupState.ready
    except KubernetesApiException:
        return ApplicationStartupState.pending

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = compute_adapter.application_pods(organization.slug, application.slug)
    except KubernetesApiException:
        return ApplicationStartupState.pending

    return application_pods_startup_state(pods, operation.created_at)


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
        return completed or operation

    if startup_state == ApplicationStartupState.dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        failed = await operations.fail(operation.id, "Application crashed during startup", operation.lease_token)
        if failed is not None:
            logger.info("Failed application creation %s", operation.id)
        return failed or operation

    if application_verification_timed_out(operation.created_at):
        await applications.set_status(application.id, ApplicationStatus.failed)
        failed = await operations.fail(operation.id, "Application startup verification timed out", operation.lease_token)
        if failed is not None:
            logger.info("Timed out application creation %s", operation.id)
        return failed or operation

    deferred = await operations.defer(operation.id, operation.lease_token)
    return deferred or operation


@operation_handler(OperationKind.application_delete, step="remove")
async def execute_application_delete(operation: Operation) -> Operation:
    """Run one application deletion cleanup step."""

    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    application_id = operation.application_id
    if application_id is None:
        raise ValueError("Operation missing application reference")

    if operation.step != "remove":
        raise ValueError(f"Unsupported application delete step '{operation.step}'")

    application = await applications.get_by_id(application_id, include_deleted=True)
    if application is None:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    await provisioning.remove_application_runtime(application, organization)
    completed = await operations.complete(operation.id, operation.lease_token)
    if completed is not None:
        logger.info("Completed application deletion %s", operation.id)
        return completed

    return operation


@operation_handler(OperationKind.organization_delete, step="remove")
async def execute_organization_delete(operation: Operation) -> Operation:
    """Run one organization deletion cleanup step."""

    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    organization_id = operation.organization_id
    if organization_id is None:
        raise ValueError("Operation missing organization reference")

    if operation.step != "remove":
        raise ValueError(f"Unsupported organization delete step '{operation.step}'")

    organization = await organizations.get(organization_id, include_deleted=True)
    if organization is None:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    await provisioning.remove_organization_runtime(organization)
    completed = await operations.complete(operation.id, operation.lease_token)
    if completed is not None:
        logger.info("Completed organization deletion %s", operation.id)
        return completed

    return operation
