from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Enum, Text, Column
from src.environments import env
from src.database.types import EncryptedType
from src.models.statuses import Status
from src.database.models.base import PlatformModel


class ComputeRegistry(PlatformModel, table=True):
    """Persist one Compute target and its Kourier and CNPG configuration.

    The kubeconfig manages Kubernetes resources while the Gateway exposes only Platform-authenticated Solution traffic.
    """

    __tablename__: ClassVar[str] = "compute_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    kubeconfig: dict[str, object] = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))

    # Reconciliation
    status: Status = Field(
        default=Status.creating,
        sa_column=Column(
            Enum(Status, name="compute_status_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )
    # Gateway
    gateway_url: str = Field(max_length=512)
    gateway_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

    # Database
    database_size_gib: int = Field(default=10)
    database_instances: int = Field(default=1)
    database_storage_class: str = Field(max_length=253)

    # Object storage
    storage_class: str = Field(max_length=253)
    storage_endpoint: str = Field(max_length=512)
    storage_size_gib: int = Field(default=100)
    storage_instances: int = Field(default=3)
    storage_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
