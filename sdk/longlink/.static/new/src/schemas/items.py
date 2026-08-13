from pydantic import Field, BaseModel


class ItemCreate(BaseModel):
    """Typed request for creating a catalog item."""

    # Item fields
    name: str = Field(min_length=1, max_length=255)
    price: float = Field(default=0, ge=0)


class ItemAttachmentRead(BaseModel):
    """Typed response for one stored attachment."""

    # File fields
    id: str
    name: str
