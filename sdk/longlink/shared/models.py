from uuid import UUID
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Uuid, Column, String
from longlink.database.types import UTCDateTime
from longlink.database.registry import Base


class Audit(Base, table=True):
    """Represent one Platform-owned Organization user shared across all Organization Applications.

    Applications have read-only access to this shared-schema projection.
    """

    __tablename__: ClassVar[str] = "audit"

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    role: str = Field(default="read", sa_column=Column(String(32), nullable=False))
    email: str = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False))

    # Platform-controlled audit timestamps are supplied during audit synchronization.
    created_at: datetime = Field(nullable=False, sa_type=UTCDateTime)
    updated_at: datetime = Field(nullable=False, sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
