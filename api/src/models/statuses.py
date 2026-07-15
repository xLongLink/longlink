from enum import StrEnum


class LocationStatus(StrEnum):
    """Lifecycle states for one immutable location aggregate."""

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
