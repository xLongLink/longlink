from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship
from src.models.users import Theme, Accent, Radius, Language
from src.db.models.__base__ import Base
from src.db.models.association import user_organizations

if TYPE_CHECKING:
    from src.db.models.organization import Organization


class User(Base, table=True):
    '''Represent a user account authenticated via OIDC.'''

    __tablename__ = 'users'

    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, max_length=255)
    avatar: str | None = Field(default=None, max_length=2048)
    theme: Theme = Field(default=Theme.system)
    accent: Accent = Field(default=Accent.amber, max_length=7)
    radius: Radius = Field(default=Radius.medium, max_length=6)
    language: Language = Field(default=Language.en, max_length=2)
    oidc_subject: str | None = Field(default=None, unique=True, max_length=255)
    organizations: list['Organization'] = Relationship(
        back_populates='users',
        sa_relationship_kwargs={'secondary': user_organizations},
    )
