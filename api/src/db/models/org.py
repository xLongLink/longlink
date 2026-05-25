from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship
from src.db.models.__base__ import Base
from src.db.models.association import user_organizations

if TYPE_CHECKING:
    from src.db.models.users import User


class Org(Base, table=True):
    '''Represent an org namespace in the control plane.'''

    __tablename__ = 'organizations'

    name: str = Field(primary_key=True, max_length=128)
    users: list['User'] = Relationship(
        back_populates='orgs',
        sa_relationship_kwargs={'secondary': user_organizations},
    )
