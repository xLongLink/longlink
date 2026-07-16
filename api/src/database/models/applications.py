from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import JSON
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Column, UniqueConstraint
from longlink.utils.time import utcnow
from src.models.statuses import ApplicationStatus
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.organizations import Organization


class Application(SQLModel, table=True):
    """Persist desired and observed runtime state for one Organization-owned LongLink Application.

    A deletion tombstone remains until reconciliation removes the Application's external resources.
    """

    __tablename__: ClassVar[str] = "applications"
    __table_args__ = (
        UniqueConstraint("organization_id", "id", name="uq_applications_organization_id_id"),
        UniqueConstraint("organization_id", "slug"),
    )

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Organization
    organization_id: UUID = Field(foreign_key="organizations.id")

    # Metadata
    name: str = Field(max_length=100)
    slug: str = Field(max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    image: str = Field(max_length=512)
    sdk: str | None = Field(default=None, max_length=128)
    digest: str | None = Field(default=None, max_length=255)
    version: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=255)

    # Configuration
    envs: dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))

    # Database
    database_password: str = Field(max_length=255)

    # Storage
    storage_access_key_id: str | None = Field(default=None, max_length=255)
    storage_secret_access_key: str | None = Field(default=None, max_length=255)

    # State
    status: ApplicationStatus = Field(
        default=ApplicationStatus.creating,
        sa_column=Column(SAEnum(ApplicationStatus, name="application_status_enum", native_enum=False), nullable=False),
    )

    # User
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Application.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=utcnow,
        nullable=False,
        sa_type=UTCDateTime,
        sa_column_kwargs={"onupdate": utcnow},
    )
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Application.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Application.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    organization: "Organization" = Relationship(back_populates="applications")
