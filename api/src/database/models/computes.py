from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Text, Column
from src.models.statuses import ComputeStatus


class ComputeRegistry(SQLModel, table=True):
    """Persist one compute target and its private-gateway reconciliation state.

    Reconciliation uses its kubeconfig to manage Kubernetes and its gateway state to proxy authenticated Application traffic.
    """

    __tablename__: ClassVar[str] = "compute_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(max_length=255, unique=True, sa_column_kwargs={"nullable": False})
    kubeconfig: str = Field(sa_column=Column(Text, nullable=False))

    # Reconciliation
    status: ComputeStatus = Field(
        default=ComputeStatus.provisioning,
        sa_column=Column(Enum(ComputeStatus, name="compute_status_enum", native_enum=False), nullable=False),
    )
    version: str | None = Field(default=None, max_length=128)

    # Gateway
    gateway_url: str | None = Field(default=None, max_length=512)
    proxy_secret: str = Field(max_length=255)
    gateway_ca_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_previous_ca_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_tls_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_tls_private_key: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
