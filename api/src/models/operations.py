from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict


class OperationStatus(str, Enum):
    """Lifecycle states for long-running platform operations."""

    scheduled = "scheduled"
    active = "active"
    ready = "ready"
    completed = "completed"
    failed = "failed"


class OperationResponse(BaseModel):
    """Represent one long-running operation in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    status: OperationStatus
    payload: dict[str, Any]
    error: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None
