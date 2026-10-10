from uuid import UUID, uuid4
from typing import Literal, ClassVar
from sqlmodel import Field
from sqlalchemy import Column
from src.environments import env
from src.database.types import EncryptedType
from src.database.models.base import AuditTable


class RegistryConnection(AuditTable, table=True):
    """Persist organization-owned container registry credentials."""

    __tablename__: ClassVar[str] = "registry_connections"

    # Provider
    host: ClassVar[str] = "ghcr.io"
    provider: ClassVar[Literal["ghcr"]] = "ghcr"

    # Identity
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(foreign_key="organizations.id", ondelete="CASCADE")

    # Authentication
    username: str = Field(max_length=100)
    credential: str = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False), repr=False)
