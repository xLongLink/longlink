from uuid import UUID, uuid4
from typing import TYPE_CHECKING, ClassVar, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from src.models.types import DatabaseSSLMode
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User


class DatabaseRegistry(SQLModel, table=True):
    """Persist one database backend available to Organizations.

    Reconciliation creates one database per Organization and one isolated schema and runtime role per LongLink Application.
    """

    __tablename__: ClassVar[str] = "database_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(max_length=128, unique=True, sa_column_kwargs={"nullable": False})

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    created_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "DatabaseRegistry.created_id"})
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(
        default_factory=utcnow,
        nullable=False,
        sa_type=UTCDateTime,
        sa_column_kwargs={"onupdate": utcnow},
    )
    updated_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "DatabaseRegistry.updated_id"})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

    # Connection
    host: str = Field(max_length=255)
    port: int
    password: str = Field(max_length=255)
    sslmode: DatabaseSSLMode = Field(default=DatabaseSSLMode.require, max_length=16)
    username: str = Field(max_length=255)

    # User
    deleted_by: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "DatabaseRegistry.deleted_id"})
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")
