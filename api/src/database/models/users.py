from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column
from src.models.roles import PlatformRoles
from src.models.types import Accent
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime
from src.database.models.base import PlatformModel
from src.database.models.association import UserOrganization


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
    accent: Accent = Field(default=Accent.neutral, max_length=7)
    radius: float = Field(default=1.0, nullable=False)

    # Relationships
    organization_memberships: list["UserOrganization"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "primaryjoin": "and_(User.id == UserOrganization.user_id, UserOrganization.deleted_at.is_(None))",
            "foreign_keys": "UserOrganization.user_id",
        },
    )
