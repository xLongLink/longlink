from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from src.database.models.__base__ import Base, new_id
from src.database.models.association import UserOrganization

if TYPE_CHECKING:
    from src.database.models.applications import App
    from src.database.models.location import Location
    from src.database.models.users import User


class Org(Base, table=True):
    """Represent an org namespace in the control plane."""

    __tablename__ = 'organizations'

    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)
    name: str = Field(unique=True, max_length=128)
    avatar: str | None = Field(default=None, max_length=2048)
    location_id: str = Field(foreign_key='locations.id', max_length=12)
    created_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    updated_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    deleted_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    location: 'Location' = Relationship(back_populates='orgs')
    apps: list['App'] = Relationship(back_populates='organization_rel')
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Org.created_by_id'})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Org.updated_by_id'})
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Org.deleted_by_id'})
    users: list['User'] = Relationship(
        back_populates='orgs',
        sa_relationship_kwargs={'secondary': UserOrganization.__table__},
    )
