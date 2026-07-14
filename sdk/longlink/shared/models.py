from uuid import UUID
from typing import Any, ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Uuid, Table, Column, String
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime
from longlink.shared.constants import SHARED_USERS_TABLE, SHARED_TABLE_INFO_KEY
from longlink.database.registry import Base, database_metadata


class User(Base, table=True):
    """Represent one platform-owned organization user readable by applications."""

    __tablename__: ClassVar[Any] = SHARED_USERS_TABLE
    __table_args__: ClassVar[dict[str, object]] = {"info": {SHARED_TABLE_INFO_KEY: True}}

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    role: str = Field(default="read", sa_column=Column(String(32), nullable=False))
    email: str = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False))

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)


shared_metadata = database_metadata
shared_users_table: Table = getattr(User, "__table__")
