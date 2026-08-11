from sqlmodel import Field, SQLModel


class PurchaseRequest(SQLModel, table=True):
    """Purchase request table owned by this application schema."""

    # Request fields
    id: int | None = Field(default=None, primary_key=True)
    text: str = Field(max_length=255)
    amount: float = Field(default=0, ge=0)
