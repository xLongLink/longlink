from uuid import UUID
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Column, ForeignKeyConstraint
from tenant.utils import utcnow
from src.models.roles import ApplicationRoles, OrganizationRoles
from tenant.database.types import UTCDateTime


class UserOrganization(SQLModel, table=True):
    """Represent one user's membership in an organization."""

    __tablename__: ClassVar[str] = "user_organizations"

    # Identifier
    user_id: UUID = Field(default=None, primary_key=True, foreign_key="users.id")
    organization_id: UUID = Field(default=None, primary_key=True, foreign_key="organizations.id")

    # State
    role: OrganizationRoles = Field(
        sa_column=Column(Enum(OrganizationRoles, name="organization_role_enum", native_enum=False), nullable=False)
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow)
    )
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")


class UserApplication(SQLModel, table=True):
    """Represent one user's membership in an application."""

    __tablename__: ClassVar[str] = "user_applications"

    # Identifier
    application_id: UUID = Field(default=None, primary_key=True)
    user_id: UUID = Field(default=None, primary_key=True, foreign_key="users.id")
    organization_id: UUID = Field(default=None, primary_key=True, foreign_key="organizations.id")

    # State
    role: ApplicationRoles = Field(
        sa_column=Column(Enum(ApplicationRoles, name="application_role_enum", native_enum=False), nullable=False)
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow)
    )
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "application_id"],
            ["applications.organization_id", "applications.id"],
            ondelete="CASCADE",
        ),
    )
