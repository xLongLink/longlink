from longlink import Audit
from sqlmodel import Field


class Item(Audit, table=True):
    """Item table owned by this Solution schema."""

    # Item fields
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    price: float = Field(default=0, ge=0)
