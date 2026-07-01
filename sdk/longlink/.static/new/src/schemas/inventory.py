from longlink import User
from pydantic import BaseModel, Field


class InventoryItemCreate(BaseModel):
    """Typed request for creating an inventory item."""

    # Item fields
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=0, ge=0)


class InventoryItemRead(BaseModel):
    """Typed response for an inventory item and its platform-managed creator."""

    # Item fields
    id: int | None
    sku: str
    name: str
    quantity: int

    # Audit fields
    created_by: User | None = None
