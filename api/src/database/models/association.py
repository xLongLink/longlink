from datetime import datetime

from sqlmodel import Field
from sqlalchemy import Enum, Column, ForeignKeyConstraint
from src.database.models.__base__ import Base, utcnow
from src.models.roles import Roles


class UserOrganization(Base, table=True):
    """Represent one user's membership in an organization."""

    __tablename__ = "user_organizations"

    # Identifier
    user_id: str = Field(default=None, primary_key=True, foreign_key="users.id", max_length=12)
    organization_id: str = Field(default=None, primary_key=True, foreign_key="organizations.id", max_length=12)

    # State
    role_name: Roles = Field(sa_column=Column(Enum(Roles, name="role_name_enum", native_enum=False), nullable=False))

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    deleted_at: datetime | None = Field(default=None)


class UserApplication(Base, table=True):
    """Represent one user's membership in an application."""

    __tablename__ = "user_applications"

    # Identifier
    application_id: str = Field(default=None, primary_key=True, max_length=12)
    user_id: str = Field(default=None, primary_key=True, foreign_key="users.id", max_length=12)
    organization_id: str = Field(default=None, primary_key=True, foreign_key="organizations.id", max_length=12)

    # State
    role_name: Roles = Field(sa_column=Column(Enum(Roles, name="role_name_enum", native_enum=False), nullable=False))

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    deleted_at: datetime | None = Field(default=None)

    __table_args__ = (
        ForeignKeyConstraint(["organization_id", "application_id"], ["applications.organization_id", "applications.id"], ondelete="CASCADE"),
    )
