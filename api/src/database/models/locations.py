from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Column, String
from tenant.utils import utcnow
from src.models.countries import DEFAULT_COUNTRY
from src.models.locations import LocationProvider
from tenant.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User


class Location(SQLModel, table=True):
    """Represent a physical or cloud location where infrastructure runs."""

    __tablename__: ClassVar[str] = "locations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(max_length=255)
    slug: str = Field(unique=True, max_length=128)
    country: str = Field(default=DEFAULT_COUNTRY, sa_column=Column(String(2), nullable=False))
    provider: LocationProvider = Field(
        default=LocationProvider.local,
        sa_column=Column(
            SAEnum(LocationProvider, name="location_provider_enum", native_enum=False, create_constraint=True),
            nullable=False,
        ),
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Location.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow))
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Location.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Location.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
