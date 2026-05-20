from sqlmodel import Field
from src.db.models.__base__ import Base


class StorageRegistry(Base, table=True):
    """Represent a registered storage backend."""

    __tablename__ = "storage_registries"

    name: str = Field(primary_key=True, max_length=128)
    protocol: str = Field(max_length=16)
    endpoint_url: str = Field(max_length=255)
    access_key_id: str = Field(max_length=255)
    secret_access_key: str = Field(max_length=255)
