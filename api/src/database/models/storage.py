from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column
from src.models.kinds import StorageKind
from src.database.models.__base__ import Base, new_id

if TYPE_CHECKING:
    from src.database.models.location import Location


class StorageRegistry(Base, table=True):
    """Represent a registered storage backend."""
    __tablename__ = "storage_registries"

    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)
    kind: StorageKind = Field(
        sa_column=Column(Enum(StorageKind, name="storage_kind_enum", native_enum=False), nullable=False)
    )
    name: str = Field(unique=True, max_length=128)
    protocol: str = Field(max_length=16)
    endpoint_url: str = Field(max_length=255)
    access_key_id: str = Field(max_length=255)
    secret_access_key: str = Field(max_length=255)
    location_id: str = Field(foreign_key='locations.id', max_length=12)
    location: 'Location' = Relationship(back_populates='storage_registries')
