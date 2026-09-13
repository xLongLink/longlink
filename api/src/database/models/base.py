from uuid import UUID
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import MetaData
from sqlalchemy.orm import relationship, declared_attr
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime


class PlatformModel(SQLModel):
    """Base SQLModel that owns the Platform database metadata."""

    metadata = MetaData()


class AuditTable(PlatformModel):
    """Base SQLModel for durable Platform records that track their acting user."""

    model_config = SQLModel.model_config.copy()
    model_config["ignored_types"] = (declared_attr,)

    # Audit timestamps
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)

    # Audit user identifiers
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Audit user relationships
    created_by = declared_attr(lambda cls: relationship("User", foreign_keys=[cls.created_id], lazy="selectin"))
    updated_by = declared_attr(lambda cls: relationship("User", foreign_keys=[cls.updated_id], lazy="selectin"))


class TombstoneAuditTable(AuditTable):
    """Add explicit tombstone attribution to audited Platform records."""

    # Tombstone state
    deleted_at: datetime | None = Field(default=None, sa_type=UTCDateTime)
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Tombstone user relationship
    deleted_by = declared_attr(lambda cls: relationship("User", foreign_keys=[cls.deleted_id], lazy="selectin"))
