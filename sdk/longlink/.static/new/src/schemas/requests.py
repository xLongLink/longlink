from pydantic import Field, BaseModel, ConfigDict


class PurchaseRequestCreate(BaseModel):
    """Typed request for creating a purchase request."""

    # Request fields
    text: str = Field(min_length=1, max_length=255)
    amount: float = Field(default=0, ge=0)


class PurchaseRequestRead(BaseModel):
    """Typed response for a purchase request."""

    model_config = ConfigDict(from_attributes=True)

    # Request fields
    id: int | None
    text: str
    amount: float


class RequestAttachmentRead(BaseModel):
    """Typed response for a file attached to one purchase request."""

    # File fields
    id: str
    name: str
    uploaded_by_name: str
    uploaded_by_avatar: str
