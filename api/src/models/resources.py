from uuid import UUID
from pydantic import BaseModel, ConfigDict
from src.models.statuses import Status


class OrganizationIdentity(BaseModel):
    """Represent a compact Organization in nested API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    avatar: str

    # State
    status: Status


class OrganizationApplicationSummary(BaseModel):
    """Represent a compact LongLink Application in nested Organization responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    description: str | None = None

    # State
    status: Status
