from uuid import UUID
from pydantic import BaseModel, ConfigDict
from src.models.statuses import Status
from longlink.models.icons import Icon


class OrganizationIdentity(BaseModel):
    """Represent a compact Organization in nested API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    avatar: str


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
