from typing import Literal
from longlink import database
from pydantic import Field, BaseModel, ConfigDict


class PurchaseRequestCreate(BaseModel):
    """Typed request for creating a purchase request."""

    # Request fields
    title: str = Field(min_length=1, max_length=255)
    amount: float = Field(default=0, ge=0)
    vendor: str = Field(min_length=1, max_length=255)
    justification: str = Field(default="", max_length=2000)


class PurchaseRequestStatusUpdate(BaseModel):
    """Typed request for changing a purchase request status."""

    # Workflow fields
    status: Literal["draft", "submitted", "approved", "rejected"]


class PurchaseRequestRead(BaseModel):
    """Typed response for a purchase request and its audit users."""

    model_config = ConfigDict(from_attributes=True)

    # Request fields
    id: int | None
    title: str
    amount: float
    status: str
    vendor: str
    justification: str

    # Audit fields
    created_by: database.AuditUser | None = None
    updated_by: database.AuditUser | None = None


class RequestAttachmentRead(BaseModel):
    """Typed response for a file attached to one purchase request."""

    # File fields
    id: str
    name: str
    size: int
    download_url: str
