from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum, Text, Column
from src.models.computes import ComputeKind

if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.locations import Location


class ComputeRegistry(SQLModel, table=True):
    """Represent a registered compute backend."""

    __tablename__: ClassVar[str] = "compute_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # State
    kind: ComputeKind = Field(
        sa_column=Column(Enum(ComputeKind, name="compute_kind_enum", native_enum=False), nullable=False)
    )

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(max_length=255, unique=True, sa_column_kwargs={"nullable": False})
    kubeconfig: str = Field(sa_column=Column(Text, nullable=False))
    ingress_host: str = Field(max_length=255)
    ingress_name: str = Field(max_length=255)
    proxy_secret: str = Field(max_length=255, index=True)
    gateway_tls_key: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_tls_certificate: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    gateway_load_balancer_ip: str | None = Field(default=None, max_length=255)

    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), sa_column_kwargs={"onupdate": lambda: datetime.now(UTC)}
    )
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None)

    # Location
    location_id: UUID = Field(foreign_key="locations.id")

    # User
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "ComputeRegistry.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    location: "Location" = Relationship()
