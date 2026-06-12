from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship
from sqlalchemy import and_, Column, Enum as SAEnum
from src.models.users import Theme, Accent, Radius, Language
from src.models.roles import PlatformRole
from src.database.models.__base__ import Base, new_id
from src.database.models.association import UserApp, UserOrganization

if TYPE_CHECKING:
    from src.database.models.organizations import Org
    from src.database.models.applications import App


class User(Base, table=True):
    """Represent a user account authenticated via OIDC."""
    __tablename__ = 'users'

    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)
    name: str
    email: str = Field(unique=True, max_length=255)
    avatar: str | None = Field(default=None, max_length=2048)
    role: PlatformRole = Field(
        default=PlatformRole.user,
        sa_column=Column(SAEnum(PlatformRole, name='platform_role_enum', native_enum=False), nullable=False),
    )
    theme: Theme = Field(default=Theme.dark)
    accent: Accent = Field(default=Accent.neutral, max_length=7)
    radius: Radius = Field(default=Radius.medium, max_length=6)
    language: Language = Field(default=Language.en, max_length=2)
    oidc_subject: str | None = Field(default=None, unique=True, max_length=255)
    orgs: list['Org'] = Relationship(
        back_populates='users',
        sa_relationship_kwargs={'secondary': UserOrganization.__table__},
    )
    apps: list['App'] = Relationship(
        back_populates='users',
        sa_relationship_kwargs={
            'secondary': UserApp.__table__,
            'primaryjoin': 'User.id == UserApp.user_id',
            'secondaryjoin': 'and_(UserApp.organization_id == App.organization_id, UserApp.app_id == App.id)',
        },
    )

    @property
    def admin(self) -> bool:
        """Return whether the user has administrator access."""

        return self.role == PlatformRole.administrator

    @admin.setter
    def admin(self, value: bool) -> None:
        """Map legacy admin flags to the platform role column."""

        self.role = PlatformRole.administrator if value else PlatformRole.user
