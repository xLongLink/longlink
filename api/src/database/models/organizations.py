from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel, Relationship
from src.database.models.association import UserOrganization

if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.locations import Location
    from src.database.models.invitations import OrganizationInvitation
    from src.database.models.applications import Application


class Organization(SQLModel, table=True):
    """Represent an org namespace in the control plane."""

    __tablename__: ClassVar[str] = 'organizations'

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(unique=True, max_length=128)
    avatar: str = Field(default="", max_length=2048, sa_column_kwargs={"nullable": False})

    # Location
    location: "Location" = Relationship()
    location_id: UUID = Field(foreign_key='locations.id')

    # User
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Organization.created_id'})
    created_id: UUID | None = Field(default=None, foreign_key='users.id')
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_column_kwargs={'onupdate': lambda: datetime.now(UTC)})
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Organization.updated_id'})
    updated_id: UUID | None = Field(default=None, foreign_key='users.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={'foreign_keys': 'Organization.deleted_id'})
    deleted_id: UUID | None = Field(default=None, foreign_key='users.id')

    # Relationships
    users: list["User"] = Relationship(back_populates='organizations', sa_relationship_kwargs={'secondary': UserOrganization.__table__, 'primaryjoin': 'Organization.id == UserOrganization.organization_id', 'secondaryjoin': 'UserOrganization.user_id == User.id'})
    invitations: list["OrganizationInvitation"] = Relationship(back_populates='organization')
    applications: list["Application"] = Relationship(back_populates='organization')
