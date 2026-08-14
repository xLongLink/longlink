from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Enum, Column
from src.models.roles import PlatformRoles
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime
from src.database.models.base import PlatformModel


class User(PlatformModel, table=True):
    """Represent a local LongLink user account."""

    __tablename__: ClassVar[str] = "users"
    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(default="", max_length=255)
    email: str = Field(unique=True, index=True, max_length=254)
    avatar: str = Field(default="", max_length=2048, sa_column_kwargs={"nullable": False})

    # Authentication
    password: str = Field(max_length=128)

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utcnow})
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

    # State
    role: PlatformRoles = Field(
        default=PlatformRoles.user,
        sa_column=Column(Enum(PlatformRoles, name="platform_role_enum", native_enum=False), nullable=False),
    )
