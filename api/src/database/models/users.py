from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime
from src.database.models.base import PlatformModel


class User(PlatformModel, table=True):
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

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utcnow})
    deleted_at: datetime | None = Field(default=None, sa_type=UTCDateTime)

    # State
    administrator: bool = Field(default=False)
