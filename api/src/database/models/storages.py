from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from tenant.utils import utcnow
from sqlalchemy import Enum, Column, DateTime
from src.models.storages import StorageKind

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.locations import Location


class StorageRegistry(SQLModel, table=True):
    """Represent a registered storage backend."""

    __tablename__: ClassVar[str] = "storage_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # State
    kind: StorageKind = Field(sa_column=Column(Enum(StorageKind, name="storage_kind_enum", native_enum=False), nullable=False))

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(max_length=128, unique=True, sa_column_kwargs={"nullable": False})

    # Connection
    endpoint_url: str = Field(max_length=255)
    access_key_id: str = Field(max_length=255)
    secret_access_key: str = Field(max_length=255)
    runtime_endpoint_url: str = Field(max_length=255)

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(DateTime(timezone=True), nullable=False))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "StorageRegistry.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(DateTime(timezone=True), nullable=False, onupdate=utcnow))
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "StorageRegistry.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "StorageRegistry.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Location
    location: "Location" = Relationship()
    location_id: UUID = Field(foreign_key="locations.id")
