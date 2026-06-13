from datetime import datetime
from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship
from sqlalchemy import and_, Column, Enum as SAEnum
from src.models.users import Theme, Accent, Radius, Language
from src.models.roles import PlatformRole
from src.database.models.__base__ import Base, new_id, utcnow
from src.database.models.association import UserApplication, UserOrganization

if TYPE_CHECKING:
    from src.database.models.organizations import Organization
    from src.database.models.applications import Application


class User(Base, table=True):
    """Represent a user account authenticated via OIDC."""
    __tablename__ = 'users'

    # Identifier
    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)

    # Metadata
    name: str
    email: str = Field(unique=True, max_length=255)
    avatar: str | None = Field(default=None, max_length=2048)
    oidc_subject: str | None = Field(default=None, unique=True, max_length=255)

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    deleted_at: datetime | None = Field(default=None)

    # State
    role: PlatformRole = Field(default=PlatformRole.user, sa_column=Column(SAEnum(PlatformRole, name='platform_role_enum', native_enum=False), nullable=False))
    theme: Theme = Field(default=Theme.dark)
    accent: Accent = Field(default=Accent.neutral, max_length=7)
    radius: Radius = Field(default=Radius.medium, max_length=6)
    language: Language = Field(default=Language.en, max_length=2)

    # Relationships
    organizations: list['Organization'] = Relationship(back_populates='users', sa_relationship_kwargs={'secondary': UserOrganization.__table__})
    applications: list['Application'] = Relationship(back_populates='users', sa_relationship_kwargs={'secondary': UserApplication.__table__, 'primaryjoin': 'User.id == UserApplication.user_id', 'secondaryjoin': 'and_(UserApplication.organization_id == Application.organization_id, UserApplication.application_id == Application.id)'})

    @property
    def admin(self) -> bool:
        """Return whether the user has administrator access."""

        return self.role == PlatformRole.administrator

    @admin.setter
    def admin(self, value: bool) -> None:
        """Map legacy admin flags to the platform role column."""

        self.role = PlatformRole.administrator if value else PlatformRole.user
