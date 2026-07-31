from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field, SQLModel
from sqlalchemy import JSON, Enum, Text, Column
from src.models.types import PlatformVersion
from src.database.types import PlatformVersionType
from src.models.statuses import Status


class ComputeRegistry(SQLModel, table=True):
    """Persist one compute target and its private-gateway reconciliation state.

    Reconciliation uses its kubeconfig to manage Kubernetes and its gateway state to proxy authenticated Application traffic.
    """

    __tablename__: ClassVar[str] = "compute_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    kubeconfig: dict[str, object] = Field(sa_column=Column(JSON, nullable=False))

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
    gateway_ca_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_identity_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_identity_private_key: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

    @property
    def gateway_tls(self) -> tuple[str, str, str] | None:
        """Return complete gateway runtime TLS material when it is available."""

        # Runtime TLS is valid only when every file mounted into Envoy is present.
        ca_certificate = self.gateway_ca_certificate
        certificate = self.gateway_identity_certificate
        private_key = self.gateway_identity_private_key
        if ca_certificate is None or certificate is None or private_key is None:
            return None
        return ca_certificate, certificate, private_key

    @property
    def gateway_connection(self) -> tuple[str, str, str, str] | None:
        """Return the complete Platform-to-gateway connection material when it is available."""

        # Proxying requires both the routable endpoint and complete mutually authenticated TLS.
        tls = self.gateway_tls
        if self.gateway_url is None or tls is None:
            return None
        return self.gateway_url, *tls
