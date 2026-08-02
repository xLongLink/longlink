from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Text, Column
from src.environments import env
from src.models.types import PlatformVersion
from src.database.types import EncryptedType, PlatformVersionType
from src.models.statuses import Status


class ComputeRegistry(SQLModel, table=True):
    """Persist one Compute target and its authenticated Envoy Gateway state.

    The kubeconfig manages Kubernetes resources while the Gateway exposes only Platform-authenticated Application traffic.
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
    version: PlatformVersion = Field(sa_column=Column(PlatformVersionType(), nullable=False))

    # Gateway
    gateway_url: str | None = Field(default=None, max_length=512)
    gateway_api_key: str | None = Field(default=None, sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=True))
    gateway_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
