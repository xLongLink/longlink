from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from src.db.models.__base__ import Base
from src.db.models.association import UserApp

if TYPE_CHECKING:
    from src.db.models.users import User


class App(Base, table=True):
    """Represent an application installed in the platform."""

    __tablename__ = 'apps'

    id: int | None = Field(default=None, primary_key=True)
    organization: str = Field(max_length=100)
    url: str = Field(unique=True, max_length=255)
    name: str = Field(unique=True, max_length=100)
    slug: str = Field(unique=True, max_length=100)
    image: str = Field(max_length=255)
    created_by_id: int | None = Field(default=None, foreign_key='users.id')
    updated_by_id: int | None = Field(default=None, foreign_key='users.id')
    deleted_by_id: int | None = Field(default=None, foreign_key='users.id')
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.created_by_id'})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.updated_by_id'})
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'App.deleted_by_id'})
    users: list['User'] = Relationship(
        back_populates='apps',
        sa_relationship_kwargs={'secondary': UserApp.__table__},
    )
