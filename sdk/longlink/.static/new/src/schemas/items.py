from uuid import UUID
from datetime import datetime
from longlink import User
from pydantic import Field, BaseModel, ConfigDict


class ItemCreate(BaseModel):
    """Typed request for creating a catalog item."""

    # Item fields
    name: str = Field(min_length=1, max_length=255)
    price: float = Field(default=0, ge=0)


class ItemRead(BaseModel):
    """Catalog item response including its Platform creator."""

    model_config = ConfigDict(from_attributes=True)

    # Item fields
    id: int
    name: str
    price: float

    # Audit timestamps
    created_at: datetime | None
    updated_at: datetime | None
    deleted_at: datetime | None

    # Audit user identifiers
    created_id: UUID | None
    updated_id: UUID | None
    deleted_id: UUID | None

    # Creator details
    created_by: User | None


class ItemAttachmentRead(BaseModel):
    """Typed response for one stored attachment."""

    # File fields
    id: str
    name: str
    size: int = Field(ge=0)
