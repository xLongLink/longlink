from sqlmodel import Field
from longlink.database.base import AuditTable


class Item(AuditTable, table=True):
    """Item table owned by this application schema."""

    # Item fields
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    price: float = Field(default=0, ge=0)
