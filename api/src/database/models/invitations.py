from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum, Column
from src.models.roles import OrganizationRoles
from longlink.tenant.utils import utcnow
from longlink.tenant.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User


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
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "OrganizationInvitation.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow))
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "OrganizationInvitation.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "OrganizationInvitation.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
