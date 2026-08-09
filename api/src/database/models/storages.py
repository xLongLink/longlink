from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Column
from src.environments import env
from src.database.types import EncryptedType
from src.database.models.base import PlatformModel


class StorageRegistry(PlatformModel, table=True):
    """Persist one Exoscale SOS backend available to Organizations."""

    __tablename__: ClassVar[str] = "storage_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)

    # Connection
    endpoint_url: str = Field(max_length=255)

    # Credentials
    access_key_id: str = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))
    secret_access_key: str = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))
