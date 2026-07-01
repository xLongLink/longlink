from enum import Enum


class ApplicationStatus(str, Enum):
    """Lifecycle states for installed applications."""

    creating = "creating"
    running = "running"
    failed = "failed"
