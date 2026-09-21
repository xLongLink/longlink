from uuid import UUID
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import MetaData
from longlink.database.types import UTCDateTime


class PlatformModel(SQLModel):
    """Base SQLModel that owns the Platform database metadata."""

    metadata = MetaData()


class AuditTable(PlatformModel):
    """Base SQLModel for durable Platform records that retain their full audit history.

    Audit columns are required persisted metadata even when application code does not
    currently read them; do not remove them through unused-field cleanup.
    """

    # Audit timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, sa_type=UTCDateTime)

    # Audit user identifiers
    # Keep durable attribution without loading User relationships on every Platform model.
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
