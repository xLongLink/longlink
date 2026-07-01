from enum import Enum
from typing import Any
from datetime import UTC, datetime, timedelta
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


POD_ROLLOUT_GRACE_SECONDS = 30
CRASHED_CONTAINER_REASONS = {
    "CrashLoopBackOff",
    "CreateContainerConfigError",
    "RunContainerError",
}


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

    for pod in relevant_pods:
        status = getattr(pod, "status", None)
        if status is None:
            continue

        container_statuses = getattr(status, "container_statuses", None) or []
        if status.phase == "Running" and container_statuses and all(container.ready for container in container_statuses):
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

            if state.waiting is not None and state.waiting.reason in CRASHED_CONTAINER_REASONS:
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

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = k8s.application_pods(organization.slug, application.slug)
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
