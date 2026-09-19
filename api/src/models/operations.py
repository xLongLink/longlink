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

    solution_deploy = "solution.deploy"
    solution_delete = "solution.delete"
    organization_create = "organization.create"
    organization_delete = "organization.delete"


class OperationResponse(BaseModel):
    """Expose administrative asynchronous reconciliation state for one Platform resource target."""

    # Identifier
    id: UUID

    # Reference
    kind: OperationKind
    target_id: UUID
    resource_name: str | None

    # State
    status: OperationStatus
    failed: str | None

    # Timestamps
    created_at: datetime
    finished_at: datetime | None
