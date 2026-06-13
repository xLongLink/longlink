from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column
from src.models.kinds import StorageKind
from src.database.models.__base__ import Base, new_id, utcnow

if TYPE_CHECKING:
    from src.database.models.location import Location
    from src.database.models.users import User


class StorageRegistry(Base, table=True):
    """Represent a registered storage backend."""

    __tablename__ = "storage_registries"

    # Identifier
    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)

    # State
    kind: StorageKind = Field(sa_column=Column(Enum(StorageKind, name="storage_kind_enum", native_enum=False), nullable=False))

    # Metadata
    name: str = Field(unique=True, max_length=128)
    protocol: str = Field(max_length=16)
    endpoint_url: str = Field(max_length=255)
    access_key_id: str = Field(max_length=255)
    secret_access_key: str = Field(max_length=255)

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'StorageRegistry.created_id'})
    created_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'StorageRegistry.updated_id'})
    updated_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    deleted_at: datetime | None = Field(default=None)
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'StorageRegistry.deleted_id'})
    deleted_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)

    # Location
    location_id: str = Field(foreign_key='locations.id', max_length=12)

    # Relationships
    location: 'Location' = Relationship(back_populates='storage_registries')
