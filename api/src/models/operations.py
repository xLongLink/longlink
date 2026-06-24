from enum import Enum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OperationKind(str, Enum):
    """Supported long-running operation types."""

    application_create = "application.create"
    application_delete = "application.delete"


class OperationResponse(BaseModel):
    """Represent one long-running operation in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: OperationKind
    step: str
    error: str | None = None
    status: str

    # Relationships
    application_id: UUID | None = None

    # Audit
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None
