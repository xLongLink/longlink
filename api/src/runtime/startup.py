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


def application_pods_startup_state(pods: list[Any], created_at: datetime) -> ApplicationStartupState:
    """Return the startup state for the application pod relevant to one verification operation."""

    threshold = created_at - timedelta(seconds=POD_ROLLOUT_GRACE_SECONDS)
    current = None

    # Ignore stale pods from older rollouts so they cannot fail a fresh verification operation.
    for pod in pods:
        metadata = runtime_value(pod, "metadata")

        # Parse creation timestamps and keep pods with missing values.
        pod_created = parse_kubernetes_timestamp(runtime_value(metadata, "creation_timestamp", "creationTimestamp"))
        if pod_created is None:
            current = pod
            break

        # Only a pod created near this verification operation can decide its result.
        if pod_created >= threshold:
            current = pod
            break

    # No current pod means the rollout is still being created.
    if current is None:
        return ApplicationStartupState.pending

    expired = datetime.now(UTC) - created_at >= timedelta(seconds=POD_STARTUP_FAILURE_GRACE_SECONDS)

    # Pods without status cannot prove readiness or terminal failure.
    status = runtime_value(current, "status")
    if status is None:
        return ApplicationStartupState.pending

    containers = runtime_value(status, "container_statuses", "containerStatuses") or []

    # Kubernetes marks the pod running before every container is necessarily ready.
    if runtime_value(status, "phase") == "Running" and containers and all(runtime_value(container, "ready") for container in containers):
        return ApplicationStartupState.ready

    # Failed or unknown pod phases are terminal for this rollout.
    if runtime_value(status, "phase") in {"Failed", "Unknown"}:
        return ApplicationStartupState.dead

    # Container states expose more specific startup failures than the pod phase.
    for container in containers:
        # Containers without state have not produced a terminal signal yet.
        state = runtime_value(container, "state")
        if state is None:
            continue

        waiting = runtime_value(state, "waiting")
        reason = runtime_value(waiting, "reason")

        # Known unrecoverable waiting reasons fail the rollout unless the grace period says otherwise.
        if reason in FAILED_CONTAINER_WAITING_REASONS:
            # Crash loops can recover after transient startup dependencies, such as DNS or database readiness.
            if reason == "CrashLoopBackOff" and not expired:
                continue

            return ApplicationStartupState.dead

        terminated = runtime_value(state, "terminated")

        # Non-zero container exits are terminal after the startup grace period.
        if terminated is not None and runtime_value(terminated, "exit_code", "exitCode") != 0:
            # Early exits may be transient while dependencies finish starting.
            if not expired:
                continue

            return ApplicationStartupState.dead

    return ApplicationStartupState.pending
