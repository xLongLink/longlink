from pydantic import Field, BaseModel, ConfigDict


class ItemCreate(BaseModel):
    """Typed request for creating a catalog item."""

    # Item fields
    name: str = Field(min_length=1, max_length=255)
    price: float = Field(default=0, ge=0)


class ItemRead(BaseModel):
    """Typed response for a catalog item."""

    model_config = ConfigDict(from_attributes=True)

    # Item fields
    id: int | None
    name: str
    price: float


class ItemAttachmentRead(BaseModel):
    """Typed response for one stored attachment."""

    # File fields
    id: str
    name: str
