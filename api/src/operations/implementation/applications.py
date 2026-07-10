from src import compute
from enum import Enum
from typing import Any
from datetime import UTC, datetime, timedelta
from src.logger import logger
from src.operations import registry
from src.operations.constants import APPLICATION_VERIFY_STEP, RESOURCE_REMOVE_STEP
from src.operations.implementation import resources, registries
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

    # Missing Kubernetes subobjects should behave like missing values.
    if item is None:
        return None

    # Try each known snake_case or camelCase runtime field name in order.
    for name in names:

        # Dict-like Kubernetes objects expose fields through item lookup.
        if isinstance(item, dict) and name in item:
            return item[name]

        # kr8s resource objects expose fields as Python attributes.
        try:
            return getattr(item, name)

        # Missing attributes mean this candidate name did not match.
        except AttributeError:
            continue

    return None


def application_verification_timed_out(operation_created_at: datetime) -> bool:
    """Return whether application startup verification has exceeded its retry window."""

    # Treat naive database timestamps as UTC so timeout comparisons stay stable.
    if operation_created_at.tzinfo is None:
        operation_created_at = operation_created_at.replace(tzinfo=UTC)

    return datetime.now(UTC) - operation_created_at >= timedelta(seconds=APPLICATION_VERIFICATION_TIMEOUT_SECONDS)


def application_pods_startup_state(pods: list[Any], operation_created_at: datetime) -> ApplicationStartupState:
    """Return the startup state for pods relevant to one verification operation."""

    # Treat naive database timestamps as UTC before comparing them with Kubernetes timestamps.
    if operation_created_at.tzinfo is None:
        operation_created_at = operation_created_at.replace(tzinfo=UTC)

    relevant_created_after = operation_created_at - timedelta(seconds=POD_ROLLOUT_GRACE_SECONDS)
    relevant_pods = []

    # Ignore stale pods from older rollouts so they cannot fail a fresh verification operation.
    for pod in pods:
        metadata = runtime_value(pod, "metadata")
        pod_created_at = parse_kubernetes_timestamp(runtime_value(metadata, "creation_timestamp", "creationTimestamp"))

        # Keep pods with missing timestamps because they may be current runtime objects from tests or adapters.
        if pod_created_at is None:
            relevant_pods.append(pod)
            continue

        # Only pods created near this verification operation can decide its result.
        if pod_created_at >= relevant_created_after:
            relevant_pods.append(pod)

    # No current pods means the rollout is still being created.
    if not relevant_pods:
        return ApplicationStartupState.pending

    failure_grace_elapsed = datetime.now(UTC) - operation_created_at >= timedelta(
        seconds=POD_STARTUP_FAILURE_GRACE_SECONDS
    )

    ready_pods = 0

    # Count pods where every known container has reached the ready state.
    for pod in relevant_pods:
        status = runtime_value(pod, "status")

        # Pods without status cannot prove readiness.
        if status is None:
            continue

        container_statuses = runtime_value(status, "container_statuses", "containerStatuses") or []

        # Kubernetes marks the pod running before every container is necessarily ready.
        if (
            runtime_value(status, "phase") == "Running"
            and container_statuses
            and all(runtime_value(container, "ready") for container in container_statuses)
        ):
            ready_pods += 1

    # The deployment is ready only when every relevant pod is ready.
    if ready_pods == len(relevant_pods):
        return ApplicationStartupState.ready

    dead_pods = 0

    # Inspect non-ready pods for terminal states that should fail verification.
    for pod in relevant_pods:
        status = runtime_value(pod, "status")

        # Pods without status may still be pending.
        if status is None:
            continue

        # Failed or unknown pod phases are terminal for this rollout.
        if runtime_value(status, "phase") in {"Failed", "Unknown"}:
            dead_pods += 1
            continue

        pod_dead = False

        # Container states expose more specific startup failures than the pod phase.
        for container in runtime_value(status, "container_statuses", "containerStatuses") or []:
            state = runtime_value(container, "state")

            # Containers without state have not produced a terminal signal yet.
            if state is None:
                continue

            waiting = runtime_value(state, "waiting")
            waiting_reason = runtime_value(waiting, "reason")

            # Known unrecoverable waiting reasons fail the rollout unless the grace period says otherwise.
            if waiting_reason in FAILED_CONTAINER_WAITING_REASONS:

                # Crash loops can recover after transient startup dependencies, such as DNS or database readiness.
                if waiting_reason == "CrashLoopBackOff" and not failure_grace_elapsed:
                    continue

                pod_dead = True

            terminated = runtime_value(state, "terminated")

            # Non-zero container exits are terminal after the startup grace period.
            if terminated is not None and runtime_value(terminated, "exit_code", "exitCode") != 0:

                # Early exits may be transient while dependencies finish starting.
                if not failure_grace_elapsed:
                    continue

                pod_dead = True

        # Count the pod as dead only after inspecting all of its containers.
        if pod_dead:
            dead_pods += 1

    # Fail only when every relevant pod is terminal; mixed states remain pending.
    if dead_pods == len(relevant_pods):
        return ApplicationStartupState.dead

    return ApplicationStartupState.pending


async def inspect_application_startup(
    operation: Operation,
    application: Application | None = None,
) -> ApplicationStartupState:
    """Inspect one application deployment startup state."""

    application_id = operation.application_id

    # Verification cannot proceed until the operation references an application.
    if application_id is None:
        return ApplicationStartupState.pending

    application = application or await applications.get_by_id(application_id)

    # Missing applications are treated as pending so the scheduler can retry within the timeout window.
    if application is None:
        return ApplicationStartupState.pending

    organization = await organizations.get_record(application.organization_id)

    # Missing organizations are treated as pending for the same retry behavior.
    if organization is None:
        return ApplicationStartupState.pending

    compute_registry = await registries.application_compute_registry(application, organization.location_id)

    # Without compute configuration there is no runtime state to inspect yet.
    if compute_registry is None:
        return ApplicationStartupState.pending

    compute_adapter = compute.kubernetes(compute_registry)

    # The deployment readiness check is the fastest success path.
    try:

        # A ready deployment is enough to complete verification without pod inspection.
        if await compute_adapter.application_deployment_ready(organization.slug, application.slug):
            return ApplicationStartupState.ready

    # Runtime adapters raise while deployments are still being created.
    except RuntimeError:
        return ApplicationStartupState.pending

    # Inspect pods once so ready and terminal states use the same runtime snapshot.
    try:
        pods = await compute_adapter.application_pods(organization.slug, application.slug)

    # Pod inspection can lag behind deployment creation.
    except RuntimeError:
        return ApplicationStartupState.pending

    return application_pods_startup_state(pods, operation.created_at)


@registry.operation_handler(OperationKind.application_create, step=APPLICATION_VERIFY_STEP)
async def execute_application_create(operation: Operation) -> Operation:
    """Run one application creation verification step."""

    # Handler state transitions require the current worker lease.
    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    application_id = operation.application_id

    # Application verification operations must reference the application row.
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id)

    # A missing application is an invalid operation payload.
    if application is None:
        raise ValueError(f"Application '{application_id}' not found")

    # The create handler only supports the verification step.
    if operation.step != APPLICATION_VERIFY_STEP:
        raise ValueError(f"Unsupported application create step '{operation.step}'")

    startup_state = await inspect_application_startup(operation, application)

    # Ready applications move to running and complete the operation.
    if startup_state == ApplicationStartupState.ready:
        await applications.set_status(application.id, ApplicationStatus.running)
        completed = await operations.complete(operation.id, operation.lease_token)

        # Log only when this worker successfully wrote the terminal state.
        if completed is not None:
            logger.info("Completed application creation %s", operation.id)
        return completed or operation

    # Dead applications fail both the application row and the operation.
    if startup_state == ApplicationStartupState.dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        failed = await operations.fail(operation.id, "Application crashed during startup", operation.lease_token)

        # Log only when this worker successfully wrote the terminal state.
        if failed is not None:
            logger.info("Failed application creation %s", operation.id)
        return failed or operation

    # Pending applications eventually fail if they never become ready.
    if application_verification_timed_out(operation.created_at):
        await applications.set_status(application.id, ApplicationStatus.failed)
        failed = await operations.fail(operation.id, "Application startup verification timed out", operation.lease_token)

        # Log only when this worker successfully wrote the terminal state.
        if failed is not None:
            logger.info("Timed out application creation %s", operation.id)
        return failed or operation

    deferred = await operations.defer(operation.id, operation.lease_token)
    return deferred or operation


@registry.operation_handler(OperationKind.application_delete, step=RESOURCE_REMOVE_STEP)
async def execute_application_delete(operation: Operation) -> Operation:
    """Run one application deletion cleanup step."""

    # Handler state transitions require the current worker lease.
    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    application_id = operation.application_id

    # Application deletion operations must reference the application row.
    if application_id is None:
        raise ValueError("Operation missing application reference")

    # The delete handler only supports the removal step.
    if operation.step != RESOURCE_REMOVE_STEP:
        raise ValueError(f"Unsupported application delete step '{operation.step}'")

    application = await applications.get_by_id(application_id, include_deleted=True)

    # Missing applications have no runtime resources to remove.
    if application is None:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    organization = await organizations.get_record(application.organization_id, include_deleted=True)

    # Missing organizations imply the namespace-level resources are already gone.
    if organization is None:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    await resources.remove_application_runtime(application, organization)
    completed = await operations.complete(operation.id, operation.lease_token)

    # Log only when this worker successfully wrote the terminal state.
    if completed is not None:
        logger.info("Completed application deletion %s", operation.id)
        return completed

    return operation


@registry.operation_handler(OperationKind.organization_delete, step=RESOURCE_REMOVE_STEP)
async def execute_organization_delete(operation: Operation) -> Operation:
    """Run one organization deletion cleanup step."""

    # Handler state transitions require the current worker lease.
    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    organization_id = operation.organization_id

    # Organization deletion operations must reference the organization row.
    if organization_id is None:
        raise ValueError("Operation missing organization reference")

    # The delete handler only supports the removal step.
    if operation.step != RESOURCE_REMOVE_STEP:
        raise ValueError(f"Unsupported organization delete step '{operation.step}'")

    organization = await organizations.get_record(organization_id, include_deleted=True)

    # Missing organizations have no runtime resources to remove.
    if organization is None:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    await resources.remove_organization_runtime(organization)
    completed = await operations.complete(operation.id, operation.lease_token)

    # Log only when this worker successfully wrote the terminal state.
    if completed is not None:
        logger.info("Completed organization deletion %s", operation.id)
        return completed

    return operation
