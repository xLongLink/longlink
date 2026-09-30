from enum import StrEnum
from longlink import User, Audit, UserRelationship
from sqlmodel import Field
from sqlalchemy import Enum


class ItemStatus(StrEnum):
    """Represent the invoice's approval state."""

    draft = "draft"
    pending = "pending"
    approved = "approved"


class Item(Audit, table=True):
    """Item table owned by this Solution schema."""

    # Item fields
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    price: float = Field(default=0, ge=0)
    status: ItemStatus = Field(
        default=ItemStatus.draft,
        sa_type=Enum(ItemStatus, name="invoice_status", native_enum=False),
    )

    # Approval attribution
    approved_by: User | None = UserRelationship()
