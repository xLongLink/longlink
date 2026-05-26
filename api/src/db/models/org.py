from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from src.db.models.__base__ import Base
from src.db.models.association import user_organizations

if TYPE_CHECKING:
    from src.db.models.users import User


class Org(Base, table=True):
    '''Represent an org namespace in the control plane.'''

    __tablename__ = 'organizations'

    name: str = Field(primary_key=True, max_length=128)
    created_by_id: int | None = Field(default=None, foreign_key='users.id')
    updated_by_id: int | None = Field(default=None, foreign_key='users.id')
    deleted_by_id: int | None = Field(default=None, foreign_key='users.id')
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Org.created_by_id'})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Org.updated_by_id'})
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Org.deleted_by_id'})
    users: list['User'] = Relationship(
        back_populates='orgs',
        sa_relationship_kwargs={'secondary': user_organizations},
    )
