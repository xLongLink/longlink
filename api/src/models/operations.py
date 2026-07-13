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
    """Supported long-running operation types."""

    application_create = "application.create"
    application_remove = "application.remove"
    organization_remove = "organization.remove"


class OperationResponse(BaseModel):
    """Represent one long-running operation in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: OperationKind
    error: str | None = None
    status: OperationStatus

    # Relationships
    application_id: UUID | None = None
    organization_id: UUID | None = None

    # Audit
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None
    scheduled_at: datetime | None = None
