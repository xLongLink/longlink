from longlink import User
from sqlmodel import Field, SQLModel


class InventoryItemCreate(SQLModel):
    """Typed payload for creating an inventory item."""

    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=0, ge=0)


class InventoryItemRead(SQLModel):
    """Typed response for an inventory item and its platform-managed creator."""

    id: int | None
    sku: str
    name: str
    quantity: int
    created_by: User | None = None
