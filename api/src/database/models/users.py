from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from src.database.models.base import AuditTable


class User(AuditTable, table=True):
    """Represent a local LongLink user account."""

    __tablename__: ClassVar[str] = "users"
    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(default="", max_length=255)
    email: str = Field(unique=True, index=True, max_length=254)
    avatar: str = Field(default="", max_length=2048)

    # Authentication
    password: str = Field(max_length=128)
    google_id: str | None = Field(default=None, unique=True, index=True, max_length=255)
    github_id: str | None = Field(default=None, unique=True, index=True, max_length=255)

    # State
    administrator: bool = Field(default=False)
