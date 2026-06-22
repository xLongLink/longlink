from datetime import datetime
from uuid import UUID

from sqlmodel import Field
from sqlalchemy import Enum, Column, ForeignKeyConstraint
from src.database.models.__base__ import Base, utcnow
from src.models.roles import Roles


class UserOrganization(Base, table=True):
    """Represent one user's membership in an organization."""

    __tablename__ = "user_organizations"

    # Identifier
    user_id: UUID = Field(default=None, primary_key=True, foreign_key="users.id")
    organization_id: UUID = Field(default=None, primary_key=True, foreign_key="organizations.id")

    # State
    role_name: Roles = Field(sa_column=Column(Enum(Roles, name="role_name_enum", native_enum=False), nullable=False))

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    created_id: UUID | None = Field(default=None, foreign_key='users.id')
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key='users.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_id: UUID | None = Field(default=None, foreign_key='users.id')


class UserApplication(Base, table=True):
    """Represent one user's membership in an application."""

    __tablename__ = "user_applications"

    # Identifier
    application_id: UUID = Field(default=None, primary_key=True)
    user_id: UUID = Field(default=None, primary_key=True, foreign_key="users.id")
    organization_id: UUID = Field(default=None, primary_key=True, foreign_key="organizations.id")

    # State
    role_name: Roles = Field(sa_column=Column(Enum(Roles, name="role_name_enum", native_enum=False), nullable=False))

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    created_id: UUID | None = Field(default=None, foreign_key='users.id')
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key='users.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_id: UUID | None = Field(default=None, foreign_key='users.id')

    __table_args__ = (
        ForeignKeyConstraint(["organization_id", "application_id"], ["applications.organization_id", "applications.id"], ondelete="CASCADE"),
    )
