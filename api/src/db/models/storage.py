from sqlalchemy import Column, Enum
from sqlmodel import Field

from src.models.kinds import StorageKind
from src.db.models.__base__ import Base


class StorageRegistry(Base, table=True):
    """Represent a registered storage backend."""

    __tablename__ = "storage_registries"

    id: int = Field(default=None, primary_key=True)
    kind: StorageKind = Field(
        sa_column=Column(Enum(StorageKind, name="storage_kind_enum", native_enum=False), nullable=False)
    )
    name: str = Field(unique=True, max_length=128)
    protocol: str = Field(max_length=16)
    endpoint_url: str = Field(max_length=255)
    access_key_id: str = Field(max_length=255)
    secret_access_key: str = Field(max_length=255)
