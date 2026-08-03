from uuid import UUID
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Uuid, Table, Column, String
from longlink.database.types import UTCDateTime
from longlink.shared.constants import SHARED_USERS_TABLE, SHARED_TABLE_INFO_KEY
from longlink.database.registry import Base, database_metadata


class User(Base, table=True):
    """Represent one Platform-owned Organization user shared across all Organization Applications.

    Applications have read-only access to this shared-schema projection.
    """

    __tablename__: ClassVar[str] = SHARED_USERS_TABLE
    __table_args__: ClassVar[dict[str, object]] = {"info": {SHARED_TABLE_INFO_KEY: True}}

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    role: str = Field(default="read", sa_column=Column(String(32), nullable=False))
    email: str = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False))

    # Platform-controlled audit timestamps are supplied during shared-user synchronization.
    created_at: datetime = Field(nullable=False, sa_type=UTCDateTime)
    updated_at: datetime = Field(nullable=False, sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)


shared_metadata = database_metadata
shared_users_table: Table = getattr(User, "__table__")
