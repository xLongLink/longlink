from enum import StrEnum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class OperationStatus(StrEnum):
    """Supported long-running operation lifecycle states."""

    active = "active"
    completed = "completed"
    failed = "failed"
    scheduled = "scheduled"


class OperationKind(StrEnum):
    """Supported registered operation handlers."""

    compute_create = "compute.create"
    application_create = "application.create"
    application_delete = "application.delete"
    organization_create = "organization.create"
    organization_delete = "organization.delete"


class OperationResource(BaseModel):
    """Represent one operation target resource."""

    # Identifier
    id: UUID

    # Metadata
    name: str


class OperationResponse(BaseModel):
    """Expose administrative asynchronous reconciliation state for one Platform resource target."""

    # Identifier
    id: UUID

    # Reference
    kind: OperationKind
    resource: OperationResource | None
    target_id: UUID

    # State
    status: OperationStatus
    failed: str | None

    # Timestamps
    created_at: datetime
    finished_at: datetime | None
