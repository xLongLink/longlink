from enum import StrEnum


class ComputeStatus(StrEnum):
    """Lifecycle states for one compute reconciliation target."""

    provisioning = "provisioning"
    ready = "ready"
    failed = "failed"
    deleting = "deleting"


class OrganizationStatus(StrEnum):
    """Lifecycle states for organization runtime resources."""

    creating = "creating"
    running = "running"
    failed = "failed"
    deleting = "deleting"


class ApplicationStatus(StrEnum):
    """Lifecycle states for installed applications."""

    creating = "creating"
    running = "running"
    failed = "failed"
    deleting = "deleting"
