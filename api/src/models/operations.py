from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class OperationResponse(BaseModel):
    """Represent one long-running operation in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    payload: dict[str, Any]
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None
