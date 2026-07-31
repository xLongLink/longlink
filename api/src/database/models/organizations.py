from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum, Column
from longlink.utils.time import utcnow
from src.models.statuses import Status
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
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

    # Infrastructure
    compute_id: UUID = Field(foreign_key="compute_registries.id", index=True)
    database_id: UUID = Field(foreign_key="database_registries.id", index=True)
    storage_id: UUID = Field(foreign_key="storage_registries.id", index=True)

    # State
    status: Status = Field(
        default=Status.creating,
        sa_column=Column(
            Enum(Status, name="organization_status_enum", native_enum=False, create_constraint=True, validate_strings=True),
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
    applications: list["Application"] = Relationship(back_populates="organization")
