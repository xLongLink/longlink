from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Column
from src.models.roles import PlatformRoles
from src.models.users import Theme, Accent, Radius, Language
from src.database.models.association import UserApplication, UserOrganization

if TYPE_CHECKING:
    from src.database.models.applications import Application
    from src.database.models.organizations import Organization


class User(SQLModel, table=True):
    """Represent a user account authenticated via OIDC."""

    __tablename__: ClassVar[str] = "users"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str
    oidc: str = Field(unique=True, max_length=255)
    email: str = Field(unique=True, max_length=254)
    avatar: str = Field(default="", max_length=2048, sa_column_kwargs={"nullable": False})

    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), sa_column_kwargs={"onupdate": lambda: datetime.now(UTC)}
    )
    deleted_at: datetime | None = Field(default=None)

    # State
    role: PlatformRoles = Field(
        default=PlatformRoles.user,
        sa_column=Column(SAEnum(PlatformRoles, name="platform_role_enum", native_enum=False), nullable=False),
    )
    theme: Theme = Field(default=Theme.dark)
    accent: Accent = Field(default=Accent.neutral, max_length=7)
    radius: Radius = Field(default=Radius.medium, max_length=6)
    language: Language = Field(default=Language.en, max_length=2)

    # Relationships
    organizations: list["Organization"] = Relationship(
        back_populates="users",
        sa_relationship_kwargs={
            "secondary": UserOrganization.__table__,
            "primaryjoin": "User.id == UserOrganization.user_id",
            "secondaryjoin": "Organization.id == UserOrganization.organization_id",
        },
    )
    applications: list["Application"] = Relationship(
        back_populates="users",
        sa_relationship_kwargs={
            "secondary": UserApplication.__table__,
            "primaryjoin": "User.id == UserApplication.user_id",
            "secondaryjoin": "and_(UserApplication.organization_id == Application.organization_id, UserApplication.application_id == Application.id)",
        },
    )
