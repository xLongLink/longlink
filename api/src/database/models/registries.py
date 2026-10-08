from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Column
from src.environments import env
from src.database.types import EncryptedType
from src.models.registries import RegistryProvider
from src.database.models.base import AuditTable


class RegistryConnection(AuditTable, table=True):
    """Persist organization-owned container registry credentials."""

    __tablename__: ClassVar[str] = "registry_connections"

    # Identity
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(foreign_key="organizations.id", ondelete="CASCADE")

    # Authentication
    username: str = Field(max_length=100)
    credential: str = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False), repr=False)

    @property
    def provider(self) -> RegistryProvider:
        """Fixed public provider identity without a persisted constant."""

        return RegistryProvider.ghcr

    @property
    def host(self) -> str:
        """Trusted host of the supported registry provider."""

        return self.provider.host
