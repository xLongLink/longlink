from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Text, Column
from src.environments import env
from src.database.types import EncryptedType
from src.database.models.base import AuditTable


class ComputeRegistry(AuditTable, table=True):
    """Persist one Compute target and its Kourier and CNPG configuration.

    The kubeconfig manages Kubernetes resources while the Gateway exposes only Platform-authenticated Solution traffic.
    """

    __tablename__: ClassVar[str] = "compute_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    cluster_uid: str = Field(unique=True, max_length=128)
    kubeconfig: dict[str, object] = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))

    # Gateway
    gateway_url: str = Field(max_length=512)
    gateway_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

    # Database
    database_storage_class: str = Field(max_length=253)

    # Object storage
    storage_endpoint: str = Field(max_length=512)
    storage_access_key: str = Field(max_length=128)
    storage_secret_key: str = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))
    storage_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
