from datetime import datetime
from uuid import UUID
from uuid import uuid4
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, String, text
from sqlmodel import Field, Relationship
from src.database.models.__base__ import Base, utcnow
from src.models.countries import Country

if TYPE_CHECKING:
    from src.database.models.compute import ComputeRegistry
    from src.database.models.database import DatabaseRegistry
    from src.database.models.organizations import Organization
    from src.database.models.storage import StorageRegistry
    from src.database.models.users import User


class Location(Base, table=True):
    """Represent a physical or cloud location where infrastructure runs."""

    __tablename__ = 'locations'

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(max_length=255)
    slug: str = Field(unique=True, max_length=128)
    country: Country | None = Field(default=None, sa_column=Column(String(2), server_default=text("'CH'"), nullable=False))

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Location.created_id'})
    created_id: UUID | None = Field(default=None, foreign_key='users.id')
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Location.updated_id'})
    updated_id: UUID | None = Field(default=None, foreign_key='users.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Location.deleted_id'})
    deleted_id: UUID | None = Field(default=None, foreign_key='users.id')

    # Relationships
    organizations: list['Organization'] = Relationship(back_populates='location')
    compute_registries: list['ComputeRegistry'] = Relationship(back_populates='location')
    database_registries: list['DatabaseRegistry'] = Relationship(back_populates='location')
    storage_registries: list['StorageRegistry'] = Relationship(back_populates='location')
