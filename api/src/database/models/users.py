from datetime import UTC, datetime
from uuid import UUID
from uuid import uuid4
from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import and_, Column, Enum as SAEnum
from src.models.users import Theme, Accent, Radius, Language
from src.models.roles import PlatformRole
from src.database.models.association import UserApplication, UserOrganization

if TYPE_CHECKING:
    from src.database.models.organizations import Organization
    from src.database.models.applications import Application


class User(SQLModel, table=True):
    """Represent a user account authenticated via OIDC."""
    __tablename__ = 'users'

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str
    email: str = Field(unique=True, max_length=255)
    avatar: str = Field(default="", max_length=2048, sa_column_kwargs={"nullable": False})
    oidc: str = Field(unique=True, max_length=255)

    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_id: UUID | None = Field(default=None, foreign_key='users.id')
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_column_kwargs={'onupdate': lambda: datetime.now(UTC)})
    updated_id: UUID | None = Field(default=None, foreign_key='users.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_id: UUID | None = Field(default=None, foreign_key='users.id')

    # State
    role: PlatformRole = Field(default=PlatformRole.user, sa_column=Column(SAEnum(PlatformRole, name='platform_role_enum', native_enum=False), nullable=False))
    theme: Theme = Field(default=Theme.dark)
    accent: Accent = Field(default=Accent.neutral, max_length=7)
    radius: Radius = Field(default=Radius.medium, max_length=6)
    language: Language = Field(default=Language.en, max_length=2)

    # Relationships
    organizations: list['Organization'] = Relationship(back_populates='users', sa_relationship_kwargs={'secondary': UserOrganization.__table__, 'primaryjoin': 'User.id == UserOrganization.user_id', 'secondaryjoin': 'Organization.id == UserOrganization.organization_id'})
    applications: list['Application'] = Relationship(back_populates='users', sa_relationship_kwargs={'secondary': UserApplication.__table__, 'primaryjoin': 'User.id == UserApplication.user_id', 'secondaryjoin': 'and_(UserApplication.organization_id == Application.organization_id, UserApplication.application_id == Application.id)'})

    @property
    def admin(self) -> bool:
        """Return whether the user has administrator access."""

        return self.role == PlatformRole.administrator

    @admin.setter
    def admin(self, value: bool) -> None:
        """Map legacy admin flags to the platform role column."""

        self.role = PlatformRole.administrator if value else PlatformRole.user
