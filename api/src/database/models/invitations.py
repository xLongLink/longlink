from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Column
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime


class OrganizationInvitation(SQLModel, table=True):
    """Represent one pending organization invitation."""

    __tablename__: ClassVar[str] = "organization_invitations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    email: str = Field(max_length=320)

    # Relationships
    organization_id: UUID = Field(foreign_key="organizations.id")

    # State
    role: OrganizationRoles = Field(
        sa_column=Column(Enum(OrganizationRoles, name="organization_role_enum", native_enum=False), nullable=False)
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
