from longlink import db
from sqlmodel import Field


class InventoryItem(db.Table, table=True):
    """Inventory item table owned by this application schema."""

    __tablename__ = "inventory_items"

    id: int | None = Field(default=None, primary_key=True)
    sku: str = Field(index=True, max_length=64)
    name: str = Field(max_length=255)
    quantity: int = Field(default=0, ge=0)
