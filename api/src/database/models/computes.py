from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Text, Column, UniqueConstraint
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User


class ComputeRegistry(SQLModel, table=True):
    """Persist the compute and private-gateway member of a Location's immutable infrastructure aggregate.

    Reconciliation uses its kubeconfig to manage Kubernetes and its gateway state to proxy authenticated Application traffic.
    """

    __tablename__: ClassVar[str] = "compute_registries"
    __table_args__ = (UniqueConstraint("location_id", name="uq_compute_registries_location_id"),)

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(max_length=255, unique=True, sa_column_kwargs={"nullable": False})
    kubeconfig: str = Field(sa_column=Column(Text, nullable=False))

    # Gateway
    gateway_url: str | None = Field(default=None, max_length=512)
    proxy_secret: str = Field(max_length=255)
    gateway_ca_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_previous_ca_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_tls_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_tls_private_key: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow))
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))

    # Location
    location_id: UUID = Field(foreign_key="locations.id")

    # User
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
