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


class OperationResponse(BaseModel):
    """Expose asynchronous reconciliation for one location's desired state.

    Only completion confirms convergence; failures include sanitized diagnostics without backend credentials.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Reference
    location_id: UUID

    # State
    error: str | None = None
    status: OperationStatus
    attempt_count: int
    platform_version: str

    # Timestamps
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None
    scheduled_at: datetime
