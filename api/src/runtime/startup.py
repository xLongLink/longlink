from typing import Any


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
