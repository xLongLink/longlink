from uuid import UUID
from pydantic import BaseModel, ConfigDict
from src.models.types import Icon
from src.models.statuses import Status


class OrganizationApplicationSummary(BaseModel):
    """Represent a compact LongLink Application in nested Organization responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    icon: Icon | None = None
    description: str | None = None

    # State
    status: Status
