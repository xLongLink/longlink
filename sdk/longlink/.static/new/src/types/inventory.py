from longlink import User
from sqlmodel import SQLModel


class InventoryItemRead(SQLModel):
    """Typed response for an inventory item and its platform-managed creator."""

    id: int | None
    sku: str
    name: str
    quantity: int
    created_by: User | None = None
