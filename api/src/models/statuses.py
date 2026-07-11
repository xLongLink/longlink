from enum import StrEnum


class ApplicationStatus(StrEnum):
    """Lifecycle states for installed applications."""

    creating = "creating"
    running = "running"
    failed = "failed"
