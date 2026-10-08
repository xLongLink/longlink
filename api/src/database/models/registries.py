from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Enum, Column
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
    provider: RegistryProvider = Field(
        default=RegistryProvider.ghcr,
        sa_column=Column(
            Enum(
                RegistryProvider, name="registry_provider_enum", native_enum=False, create_constraint=True, validate_strings=True, length=50
            ),
            nullable=False,
        ),
    )
    username: str = Field(max_length=100)
    credential: str = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False), repr=False)

    @property
    def host(self) -> str:
        """Derive the trusted host from the configured provider."""

        return RegistryProvider(self.provider).host
