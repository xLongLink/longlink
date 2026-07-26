from enum import StrEnum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OperationStatus(StrEnum):
    """Supported long-running operation lifecycle states."""

    active = "active"
    completed = "completed"
    failed = "failed"
    scheduled = "scheduled"


class OperationKind(StrEnum):
    """Supported registered operation handlers."""

    compute = "compute"
    database = "database"
    storage = "storage"


class ReconciliationScope(StrEnum):
    """Select Platform-only work or Application work with its Platform dependencies."""

    platform = "platform"
    application = "application"


class OperationResponse(BaseModel):
    """Expose asynchronous reconciliation for one Platform resource target."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Reference
    kind: OperationKind
    target_id: UUID
    compute_id: UUID

    # State
    scope: ReconciliationScope
    status: OperationStatus
    attempt_count: int
    platform_version: str

    # Timestamps
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None
    scheduled_at: datetime
