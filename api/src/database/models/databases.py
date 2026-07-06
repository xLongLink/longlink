from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum, Column
from src.models.databases import DatabaseKind

if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.locations import Location


class DatabaseRegistry(SQLModel, table=True):
    """Represent a registered database backend."""

    __tablename__: ClassVar[str] = "database_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # State
    kind: DatabaseKind = Field(
        sa_column=Column(Enum(DatabaseKind, name="database_kind_enum", native_enum=False), nullable=False)
    )

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(max_length=128, unique=True, sa_column_kwargs={"nullable": False})

    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "DatabaseRegistry.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), sa_column_kwargs={"onupdate": lambda: datetime.now(UTC)}
    )
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "DatabaseRegistry.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None)

    # Connection
    host: str = Field(max_length=255)
    port: int
    password: str = Field(max_length=255)
    username: str = Field(max_length=255)
    runtime_host: str = Field(max_length=255)
    runtime_port: int

    # Location
    location_id: UUID = Field(foreign_key="locations.id")

    # User
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "DatabaseRegistry.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    location: "Location" = Relationship()
