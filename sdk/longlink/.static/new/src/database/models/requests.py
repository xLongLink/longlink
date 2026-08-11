from longlink import database
from sqlmodel import Field, SQLModel


class PurchaseRequest(SQLModel, table=True):
    """Purchase request table owned by this application schema."""

    # Request fields
    id: int | None = Field(default=None, primary_key=True)
    text: str = Field(max_length=255)
    amount: float = Field(default=0, ge=0)


class RequestAttachment(database.AuditTable, table=True):
    """Persist attachment metadata and its uploading Platform user."""

    # Identifiers
    id: int | None = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key="purchaserequest.id", index=True)
    file_id: str = Field(index=True, unique=True, max_length=255)
