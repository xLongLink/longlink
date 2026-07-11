from enum import StrEnum
from typing import Any
from datetime import UTC, datetime, timedelta
from src.runtime.resources import parse_kubernetes_timestamp


class ApplicationStartupState(StrEnum):
    """Runtime startup states for one deployed application."""

    pending = "pending"
    ready = "ready"
    dead = "dead"


POD_ROLLOUT_GRACE_SECONDS = 30
POD_STARTUP_FAILURE_GRACE_SECONDS = 2 * 60
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

        # Parse creation timestamps and keep pods with missing values.
        pod_created_at = parse_kubernetes_timestamp(runtime_value(metadata, "creation_timestamp", "creationTimestamp"))
        if pod_created_at is None:
            relevant_pods.append(pod)
            continue

        # Only pods created near this verification operation can decide its result.
        if pod_created_at >= relevant_created_after:
            relevant_pods.append(pod)

    # No current pods means the rollout is still being created.
    if not relevant_pods:
        return ApplicationStartupState.pending

    failure_grace_elapsed = datetime.now(UTC) - operation_created_at >= timedelta(seconds=POD_STARTUP_FAILURE_GRACE_SECONDS)
    ready_pods = 0

    # Count pods where every known container has reached the ready state.
    for pod in relevant_pods:
        # Pods without status cannot prove readiness.
        status = runtime_value(pod, "status")
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
        # Pods without status may still be pending.
        status = runtime_value(pod, "status")
        if status is None:
            continue

        # Failed or unknown pod phases are terminal for this rollout.
        if runtime_value(status, "phase") in {"Failed", "Unknown"}:
            dead_pods += 1
            continue

        pod_dead = False

        # Container states expose more specific startup failures than the pod phase.
        for container in runtime_value(status, "container_statuses", "containerStatuses") or []:
            # Containers without state have not produced a terminal signal yet.
            state = runtime_value(container, "state")
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
