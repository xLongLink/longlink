from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from sqlalchemy import UniqueConstraint
from src.database.models.__base__ import Base
from src.database.models.association import UserApp

if TYPE_CHECKING:
    from src.database.models.org import Org
    from src.database.models.users import User


class App(Base, table=True):
    """Represent an application installed in the platform."""

    __tablename__ = 'apps'
    __table_args__ = (
        UniqueConstraint('organization', 'name'),
        UniqueConstraint('organization', 'slug'),
    )

    id: int | None = Field(default=None, primary_key=True)
    organization: str = Field(foreign_key='organizations.name', max_length=100)
    name: str = Field(unique=True, max_length=100)
    slug: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=255)
    image: str = Field(max_length=255)
    icon: str | None = Field(default=None, max_length=50)
    created_by_id: int | None = Field(default=None, foreign_key='users.id')
    updated_by_id: int | None = Field(default=None, foreign_key='users.id')
    deleted_by_id: int | None = Field(default=None, foreign_key='users.id')
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.created_by_id'})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.updated_by_id'})
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.deleted_by_id'})
    organization_rel: 'Org' = Relationship(back_populates='apps')
    users: list['User'] = Relationship(
        back_populates='apps',
        sa_relationship_kwargs={'secondary': UserApp.__table__},
    )
