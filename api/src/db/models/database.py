from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column
from src.models.kinds import DatabaseKind
from src.db.models.__base__ import Base

if TYPE_CHECKING:
    from src.db.models.location import Location
    from src.db.models.users import User


class DatabaseRegistry(Base, table=True):
    """Represent a registered database backend."""

    __tablename__ = "database_registries"

    id: int = Field(default=None, primary_key=True)
    kind: DatabaseKind = Field(
        sa_column=Column(Enum(DatabaseKind, name="database_kind_enum", native_enum=False), nullable=False)
    )
    name: str = Field(unique=True, max_length=128)
    host: str = Field(max_length=255)
    port: int
    username: str = Field(max_length=255)
    password: str = Field(max_length=255)
    sslmode: str | None = Field(default=None, max_length=32)
    maintenance_database: str = Field(default="postgres", max_length=255)
    location_id: int = Field(foreign_key='locations.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_by_id: int | None = Field(default=None, foreign_key='users.id')
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'DatabaseRegistry.deleted_by_id'})
    location: 'Location' = Relationship(back_populates='database_registries')
