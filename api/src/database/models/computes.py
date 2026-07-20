from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum, Text, Column
from longlink.utils.time import utcnow
from src.models.statuses import ComputeStatus
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User


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

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=utcnow,
        nullable=False,
        sa_type=UTCDateTime,
        sa_column_kwargs={"onupdate": utcnow},
    )
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

    # User
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
