from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Column, ForeignKeyConstraint
from src.models.roles import Roles


class UserOrganization(SQLModel, table=True):
    """Represent one user's membership in an organization."""

    __tablename__ = "user_organizations"

    user_id: int = Field(default=None, primary_key=True, foreign_key="users.id")
    organization_name: str = Field(
        default=None,
        primary_key=True,
        foreign_key="organizations.name",
        max_length=128,
    )
    role_name: Roles = Field(
        sa_column=Column(Enum(Roles, name="role_name_enum", native_enum=False), nullable=False)
    )


class UserApp(SQLModel, table=True):
    """Represent one user's membership in an application."""

    __tablename__ = "user_apps"

    user_id: int = Field(default=None, primary_key=True, foreign_key="users.id")
    organization_name: str = Field(
        default=None,
        primary_key=True,
        foreign_key="organizations.name",
        max_length=128,
    )
    app_name: str = Field(default=None, primary_key=True, max_length=100)
    role_name: Roles = Field(
        sa_column=Column(Enum(Roles, name="role_name_enum", native_enum=False), nullable=False)
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_name", "app_name"],
            ["apps.organization", "apps.name"],
            ondelete="CASCADE",
        ),
    )
