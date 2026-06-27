from uuid import UUID, uuid4
from typing import TYPE_CHECKING, Optional
from datetime import UTC, datetime
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, Enum
from src.models.roles import OrganizationRoles

if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.organizations import Organization


class OrganizationInvitation(SQLModel, table=True):
    """Represent one pending organization invitation."""

    __tablename__ = "organization_invitations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    email: str = Field(max_length=320)

    # Relationships
    organization: "Organization" = Relationship(back_populates="invitations")
    organization_id: UUID = Field(foreign_key="organizations.id")

    # State
    role_name: OrganizationRoles = Field(
        sa_column=Column(Enum(OrganizationRoles, name="organization_role_enum", native_enum=False), nullable=False)
    )

    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "OrganizationInvitation.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_column_kwargs={"onupdate": lambda: datetime.now(UTC)})
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "OrganizationInvitation.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None)
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "OrganizationInvitation.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
