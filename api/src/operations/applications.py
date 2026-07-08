from src import compute
from enum import Enum
from typing import Any
from datetime import UTC, datetime, timedelta
from src.logger import logger
from src.compute import ComputeResourceError
from src.operations import registry, provisioning
from src.models.statuses import ApplicationStatus
from src.compute.resources import parse_kubernetes_timestamp
from src.database.services import operations, applications, organizations
from src.models.operations import OperationKind
from src.database.models.operations import Operation
from src.database.models.applications import Application


class ApplicationStartupState(str, Enum):
    """Runtime startup states for one deployed application."""

    pending = "pending"
    ready = "ready"
    dead = "dead"


POD_ROLLOUT_GRACE_SECONDS = 30
POD_STARTUP_FAILURE_GRACE_SECONDS = 2 * 60
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


def runtime_value(item: Any, *names: str) -> Any:
    """Return one value from dict-like or attribute-based Kubernetes objects."""

    if item is None:
        return None

    for name in names:
        if isinstance(item, dict) and name in item:
            return item[name]

        try:
            return getattr(item, name)
        except AttributeError:
            continue

    return None


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
        metadata = runtime_value(pod, "metadata")
        pod_created_at = parse_kubernetes_timestamp(runtime_value(metadata, "creation_timestamp", "creationTimestamp"))
        if pod_created_at is None:
            relevant_pods.append(pod)
            continue

        if pod_created_at >= relevant_created_after:
            relevant_pods.append(pod)

    if not relevant_pods:
        return ApplicationStartupState.pending

    failure_grace_elapsed = datetime.now(UTC) - operation_created_at >= timedelta(
        seconds=POD_STARTUP_FAILURE_GRACE_SECONDS
    )

    ready_pods = 0
    for pod in relevant_pods:
        status = runtime_value(pod, "status")
        if status is None:
            continue

        container_statuses = runtime_value(status, "container_statuses", "containerStatuses") or []
        if (
            runtime_value(status, "phase") == "Running"
            and container_statuses
            and all(runtime_value(container, "ready") for container in container_statuses)
        ):
            ready_pods += 1

    if ready_pods == len(relevant_pods):
        return ApplicationStartupState.ready

    dead_pods = 0
    for pod in relevant_pods:
        status = runtime_value(pod, "status")
        if status is None:
            continue

        if runtime_value(status, "phase") in {"Failed", "Unknown"}:
            dead_pods += 1
            continue

        pod_dead = False
        for container in runtime_value(status, "container_statuses", "containerStatuses") or []:
            state = runtime_value(container, "state")
            if state is None:
                continue

            waiting = runtime_value(state, "waiting")
            waiting_reason = runtime_value(waiting, "reason")
            if waiting_reason in FAILED_CONTAINER_WAITING_REASONS:
                # Crash loops can recover after transient startup dependencies, such as DNS or database readiness.
                if waiting_reason == "CrashLoopBackOff" and not failure_grace_elapsed:
                    continue

                pod_dead = True

            terminated = runtime_value(state, "terminated")
            if terminated is not None and runtime_value(terminated, "exit_code", "exitCode") != 0:
                if not failure_grace_elapsed:
                    continue

                pod_dead = True

        if pod_dead:
            dead_pods += 1

    if dead_pods == len(relevant_pods):
        return ApplicationStartupState.dead

    return ApplicationStartupState.pending


async def inspect_application_startup(
    operation: Operation,
    application: Application | None = None,
) -> ApplicationStartupState:
    """Inspect one application deployment startup state."""

    application_id = operation.application_id
    if application_id is None:
        return ApplicationStartupState.pending

    application = application or await applications.get_by_id(application_id)
    if application is None:
        return ApplicationStartupState.pending

    organization = await organizations.get(application.organization_id)
    if organization is None:
        return ApplicationStartupState.pending

    compute_registry = await provisioning.application_compute_registry(application, organization.location_id)
    if compute_registry is None:
        return ApplicationStartupState.pending

    compute_adapter = compute.kubernetes(compute_registry)

    try:
        if await compute_adapter.application_deployment_ready(organization.slug, application.slug):
            return ApplicationStartupState.ready
    except ComputeResourceError:
        return ApplicationStartupState.pending

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = await compute_adapter.application_pods(organization.slug, application.slug)
    except ComputeResourceError:
        return ApplicationStartupState.pending

    return application_pods_startup_state(pods, operation.created_at)


@registry.operation_handler(OperationKind.application_create, step="verify")
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

    startup_state = await inspect_application_startup(operation, application)
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


@registry.operation_handler(OperationKind.application_delete, step="remove")
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


@registry.operation_handler(OperationKind.organization_delete, step="remove")
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
