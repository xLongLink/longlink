from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, String
from longlink.utils.time import utcnow
from src.models.statuses import OrganizationStatus
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.computes import ComputeRegistry
    from src.database.models.storages import StorageRegistry
    from src.database.models.databases import DatabaseRegistry
    from src.database.models.applications import Application


class Organization(SQLModel, table=True):
    """Persist the tenant boundary and its immutable infrastructure assignments.

    A deletion tombstone remains until reconciliation removes the Organization's external resources.
    """

    __tablename__: ClassVar[str] = "organizations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(unique=True, max_length=128)
    avatar: str = Field(default="", max_length=2048, sa_column_kwargs={"nullable": False})
    country: str = Field(sa_column=Column(String(2), nullable=False))

    # Infrastructure
    compute: "ComputeRegistry" = Relationship()
    compute_id: UUID = Field(foreign_key="compute_registries.id", index=True)
    database: "DatabaseRegistry" = Relationship()
    database_id: UUID = Field(foreign_key="database_registries.id", index=True)
    storage: "StorageRegistry" = Relationship()
    storage_id: UUID = Field(foreign_key="storage_registries.id", index=True)

    # Database
    shared_schema_url: str = Field(max_length=2048)

    # State
    status: OrganizationStatus = Field(
        default=OrganizationStatus.creating,
        sa_column=Column(
            String(20),
            nullable=False,
        ),
    )

    # User
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Organization.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=utcnow,
        nullable=False,
        sa_type=UTCDateTime,
        sa_column_kwargs={"onupdate": utcnow},
    )
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Organization.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Organization.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    applications: list["Application"] = Relationship(back_populates="organization")
