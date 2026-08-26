from enum import StrEnum


class Status(StrEnum):
    """Lifecycle states shared by Platform-managed resources."""

    creating = "creating"
    failed = "failed"
    running = "running"
