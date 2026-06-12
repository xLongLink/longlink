from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Column, UniqueConstraint, and_
from src.models.applications import AppStatus
from src.database.models.__base__ import Base, new_id
from src.database.models.association import UserApp

if TYPE_CHECKING:
    from src.database.models.organizations import Org
    from src.database.models.users import User


class App(Base, table=True):
    """Represent an application installed in the platform."""

    __tablename__ = 'apps'
    __table_args__ = (
        UniqueConstraint('organization_id', 'name'),
        UniqueConstraint('organization_id', 'slug'),
    )

    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)
    organization_id: str = Field(foreign_key='organizations.id', max_length=12)
    name: str = Field(unique=True, max_length=100)
    slug: str = Field(max_length=100)
    status: AppStatus = Field(
        default=AppStatus.creating,
        sa_column=Column(SAEnum(AppStatus, name='app_status_enum', native_enum=False), nullable=False),
    )
    description: str | None = Field(default=None, max_length=255)
    image: str = Field(max_length=255)
    icon: str | None = Field(default=None, max_length=50)
    created_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    updated_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    deleted_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.created_by_id'})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.updated_by_id'})
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.deleted_by_id'})
    organization_rel: 'Org' = Relationship(back_populates='apps')
    users: list['User'] = Relationship(
        back_populates='apps',
        sa_relationship_kwargs={
            'secondary': UserApp.__table__,
            'primaryjoin': 'and_(App.organization_id == UserApp.organization_id, App.id == UserApp.app_id)',
            'secondaryjoin': 'UserApp.user_id == User.id',
        },
    )

    @property
    def organization(self) -> str:
        """Return the organization name for API responses."""

        return self.organization_rel.name if self.organization_rel is not None else self.organization_id
