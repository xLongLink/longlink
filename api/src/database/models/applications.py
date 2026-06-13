from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, Enum as SAEnum, UniqueConstraint, and_
from sqlmodel import Field, Relationship

from src.database.models.__base__ import Base, new_id
from src.database.models.association import UserApplication
from src.models.applications import AppStatus

if TYPE_CHECKING:
    from src.database.models.organizations import Organization
    from src.database.models.users import User


class Application(Base, table=True):
    """Represent an application installed in the platform."""

    __tablename__ = 'applications'
    __table_args__ = (
        UniqueConstraint('organization_id', 'slug'),
    )

    # Identifier
    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)

    # References
    organization_id: str = Field(foreign_key='organizations.id', max_length=12)

    # Metadata
    name: str = Field(unique=True, max_length=100)
    slug: str = Field(max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    image: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=255)

    # State
    status: AppStatus = Field(default=AppStatus.creating, sa_column=Column(SAEnum(AppStatus, name='app_status_enum', native_enum=False), nullable=False))

    # Audit
    created_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    updated_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)
    deleted_by_id: str | None = Field(default=None, foreign_key='users.id', max_length=12)

    # Relationships
    created_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Application.created_by_id'})
    updated_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Application.updated_by_id'})
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Application.deleted_by_id'})
    organization: 'Organization' = Relationship(back_populates='applications')
    users: list['User'] = Relationship(back_populates='applications', sa_relationship_kwargs={'secondary': UserApplication.__table__, 'primaryjoin': 'and_(Application.organization_id == UserApplication.organization_id, Application.id == UserApplication.application_id)', 'secondaryjoin': 'UserApplication.user_id == User.id'})

