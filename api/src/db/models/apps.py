from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship
from src.db.models.__base__ import Base
from src.db.models.association import user_apps

if TYPE_CHECKING:
    from src.db.models.users import User


class App(Base, table=True):
    '''Represent an application installed in the platform.'''

    __tablename__ = 'apps'

    organization: str = Field(primary_key=True, max_length=100)
    url: str = Field(unique=True, max_length=255)
    name: str = Field(primary_key=True, max_length=100)
    image: str = Field(max_length=255)
    users: list['User'] = Relationship(
        back_populates='apps',
        sa_relationship_kwargs={'secondary': user_apps},
    )
