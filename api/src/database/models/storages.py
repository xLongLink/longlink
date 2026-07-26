from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Column
from src.models.types import StorageKind


class StorageRegistry(SQLModel, table=True):
    """Persist one Exoscale SOS backend available to Organizations."""

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
    runtime_endpoint_url: str = Field(max_length=255)

    # Credentials
    access_key_id: str = Field(max_length=255)
    secret_access_key: str = Field(max_length=255)
