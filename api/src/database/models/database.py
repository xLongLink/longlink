from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column
from src.models.kinds import DatabaseKind
from src.database.models.__base__ import Base, new_id, utcnow

if TYPE_CHECKING:
    from src.database.models.location import Location
    from src.database.models.users import User


class DatabaseRegistry(Base, table=True):
    """Represent a registered database backend."""

    __tablename__ = "database_registries"

    # Identifier
    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)

    # State
    kind: DatabaseKind = Field(sa_column=Column(Enum(DatabaseKind, name="database_kind_enum", native_enum=False), nullable=False))

    # Metadata
    name: str = Field(unique=True, max_length=128)

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'DatabaseRegistry.created_id'})
    created_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'DatabaseRegistry.updated_id'})
    updated_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    deleted_at: datetime | None = Field(default=None)

    # Connection
    host: str = Field(max_length=255)
    port: int
    username: str = Field(max_length=255)
    password: str = Field(max_length=255)

    # Location
    location_id: str = Field(foreign_key='locations.id', max_length=12)

    # User
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'DatabaseRegistry.deleted_id'})
    deleted_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)

    # Relationships
    location: 'Location' = Relationship(back_populates='database_registries')
