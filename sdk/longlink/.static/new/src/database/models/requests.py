from longlink import db
from sqlmodel import Field


class PurchaseRequest(db.Table, table=True):
    """Purchase request table owned by this application schema."""

    __tablename__ = "purchase_requests"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=255)
    amount: float = Field(default=0, ge=0)
    status: str = Field(default="draft", max_length=32)
    vendor: str = Field(max_length=255)
    justification: str = Field(default="", max_length=2000)
