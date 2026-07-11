from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Column
from tenant.utils import utcnow
from src.models.roles import PlatformRoles
from src.models.users import Theme, Accent, Radius
from tenant.database.types import UTCDateTime
from tenant.models.languages import Language
from src.database.models.association import UserApplication, UserOrganization

# Import relationship targets only during type checking.
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
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    updated_at: datetime = Field(
        default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow)
    )
    deleted_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))

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
            "primaryjoin": "and_(User.id == UserOrganization.user_id, UserOrganization.deleted_at.is_(None))",
            "secondaryjoin": "and_(Organization.id == UserOrganization.organization_id, Organization.deleted_at.is_(None))",
        },
    )
    applications: list["Application"] = Relationship(
        back_populates="users",
        sa_relationship_kwargs={
            "secondary": UserApplication.__table__,
            "primaryjoin": "and_(User.id == UserApplication.user_id, UserApplication.deleted_at.is_(None))",
            "secondaryjoin": "and_(UserApplication.organization_id == Application.organization_id, UserApplication.application_id == Application.id, Application.deleted_at.is_(None))",
        },
    )
