from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Column, UniqueConstraint
from src.models.statuses import ApplicationStatus
from src.database.models.association import UserApplication

if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.computes import ComputeRegistry
    from src.database.models.storages import StorageRegistry
    from src.database.models.databases import DatabaseRegistry
    from src.database.models.organizations import Organization


class Application(SQLModel, table=True):
    """Represent an application installed in the platform."""

    __tablename__: ClassVar[str] = "applications"
    __table_args__ = (UniqueConstraint("organization_id", "slug"),)

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # References
    organization_id: UUID = Field(foreign_key="organizations.id")
    compute_registry_id: UUID | None = Field(default=None, foreign_key="compute_registries.id")
    database_registry_id: UUID | None = Field(default=None, foreign_key="database_registries.id")
    storage_registry_id: UUID | None = Field(default=None, foreign_key="storage_registries.id")

    # Metadata
    name: str = Field(max_length=100)
    slug: str = Field(max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    image: str = Field(max_length=255)
    sdk: str | None = Field(default=None, max_length=128)
    digest: str | None = Field(default=None, max_length=255)
    version: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=255)

    # State
    status: ApplicationStatus = Field(
        default=ApplicationStatus.creating,
        sa_column=Column(SAEnum(ApplicationStatus, name="application_status_enum", native_enum=False), nullable=False),
    )

    # User
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Application.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), sa_column_kwargs={"onupdate": lambda: datetime.now(UTC)}
    )
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Application.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None)
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Application.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    organization: "Organization" = Relationship(back_populates="applications")
    compute_registry: Optional["ComputeRegistry"] = Relationship()
    database_registry: Optional["DatabaseRegistry"] = Relationship()
    storage_registry: Optional["StorageRegistry"] = Relationship()
    users: list["User"] = Relationship(
        back_populates="applications",
        sa_relationship_kwargs={
            "secondary": UserApplication.__table__,
            "primaryjoin": "and_(Application.organization_id == UserApplication.organization_id, Application.id == UserApplication.application_id)",
            "secondaryjoin": "UserApplication.user_id == User.id",
        },
    )
