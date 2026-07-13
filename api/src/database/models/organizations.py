from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, String
from tenant.utils import utcnow
from src.models.countries import DEFAULT_COUNTRY
from tenant.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.locations import Location
    from src.database.models.applications import Application


class Organization(SQLModel, table=True):
    """Represent an organization namespace in the LongLink Platform."""

    __tablename__: ClassVar[str] = "organizations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(unique=True, max_length=128)
    avatar: str = Field(default="", max_length=2048, sa_column_kwargs={"nullable": False})
    country: str = Field(default=DEFAULT_COUNTRY, sa_column=Column(String(2), nullable=False))

    # Location
    location: "Location" = Relationship()
    location_id: UUID = Field(foreign_key="locations.id")

    # Database
    shared_schema_url: str | None = Field(default=None, max_length=2048)

    # User
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Organization.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow))
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Organization.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Organization.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    applications: list["Application"] = Relationship(back_populates="organization")
