from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from src.database.models.__base__ import Base, new_id
from src.database.models.association import UserOrganization

if TYPE_CHECKING:
    from src.database.models.applications import Application
    from src.database.models.location import Location
    from src.database.models.users import User


class Organization(Base, table=True):
    """Represent an org namespace in the control plane."""

    __tablename__ = 'organizations'

    # Identifier
    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    avatar: str | None = Field(default=None, max_length=2048)

    # Location
    location_id: str = Field(foreign_key='locations.id', max_length=12)

    # Audit
    created_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    updated_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    deleted_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)

    # Relationships
    location: 'Location' = Relationship(back_populates='organizations')
    applications: list['Application'] = Relationship(back_populates='organization')
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Organization.created_by_id'})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Organization.updated_by_id'})
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Organization.deleted_by_id'})
    users: list['User'] = Relationship(back_populates='organizations', sa_relationship_kwargs={'secondary': UserOrganization.__table__})

