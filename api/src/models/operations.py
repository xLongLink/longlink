from enum import Enum
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OperationKind(str, Enum):
    """Supported long-running operation types."""

    app_create = "app.create"
    app_delete = "app.delete"


class OperationResponse(BaseModel):
    """Represent one long-running operation in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: OperationKind
    app_id: int | None = None
    step: str
    status: str
    error: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None
