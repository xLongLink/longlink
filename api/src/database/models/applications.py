from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum, Column, UniqueConstraint
from src.environments import env
from src.database.types import EncryptedType
from longlink.utils.time import utcnow
from src.models.statuses import Status
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.organizations import Organization


class Application(SQLModel, table=True):
    """Persist desired and observed runtime state for one Organization-owned LongLink Application.

    A deletion tombstone remains until reconciliation removes the Application's external resources.
    """

    __tablename__: ClassVar[str] = "applications"
    __table_args__ = (UniqueConstraint("organization_id", "slug"),)

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Organization
    organization_id: UUID = Field(foreign_key="organizations.id")

    # Metadata
    name: str = Field(max_length=100)
    slug: str = Field(max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    image: str = Field(max_length=512)
    version: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=255)

    # Secrets
    secrets: dict[str, str] = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))

    # State
    status: Status = Field(
        default=Status.creating,
        sa_column=Column(
            Enum(Status, name="application_status_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    organization: "Organization" = Relationship(back_populates="applications")
