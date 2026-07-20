from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Column, UniqueConstraint
from src.models.roles import PlatformRoles
from src.models.types import Theme, Accent, Radius, Language
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime
from src.database.models.association import UserApplication, UserOrganization


class User(SQLModel, table=True):
    """Represent a local LongLink user account."""

    __tablename__: ClassVar[str] = "users"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(default="", max_length=255)
    email: str = Field(unique=True, index=True, max_length=254)
    avatar: str = Field(default="", max_length=2048, sa_column_kwargs={"nullable": False})

    # Authentication
    hashed_password: str = Field(max_length=1024)
    is_verified: bool = Field(default=False, nullable=False)

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    updated_at: datetime = Field(
        default_factory=utcnow,
        nullable=False,
        sa_type=UTCDateTime,
        sa_column_kwargs={"onupdate": utcnow},
    )
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

    # State
    is_active: bool = Field(default=True, nullable=False)
    is_superuser: bool = Field(default=False, nullable=False)
    role: PlatformRoles = Field(
        default=PlatformRoles.user,
        sa_column=Column(SAEnum(PlatformRoles, name="platform_role_enum", native_enum=False), nullable=False),
    )
    theme: Theme = Field(default=Theme.dark)
    accent: Accent = Field(default=Accent.neutral, max_length=7)
    radius: Radius = Field(default=Radius.medium, max_length=6)
    language: Language = Field(default=Language.en, max_length=2)

    # Relationships
    organization_memberships: list["UserOrganization"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "primaryjoin": "and_(User.id == UserOrganization.user_id, UserOrganization.deleted_at.is_(None))",
            "foreign_keys": "UserOrganization.user_id",
        },
    )
    application_memberships: list["UserApplication"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "primaryjoin": "and_(User.id == UserApplication.user_id, UserApplication.deleted_at.is_(None))",
            "foreign_keys": "UserApplication.user_id",
        },
    )
    oauth_accounts: list["OAuthAccount"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"lazy": "selectin", "cascade": "all, delete-orphan"},
    )


class OAuthAccount(SQLModel, table=True):
    """Link a LongLink user to an external OAuth or OIDC identity."""

    __tablename__: ClassVar[str] = "oauth_accounts"
    __table_args__ = (UniqueConstraint("oauth_name", "account_id", name="uq_oauth_accounts_provider_subject"),)

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True, ondelete="CASCADE")

    # Provider identity
    oauth_name: str = Field(max_length=100, index=True)
    account_id: str = Field(max_length=320, index=True)
    account_email: str = Field(max_length=320)

    # FastAPI Users requires these fields, but LongLink discards provider credentials.
    access_token: str = Field(default="", max_length=1024)
    expires_at: int | None = Field(default=None)
    refresh_token: str | None = Field(default=None, max_length=1024)

    # Relationships
    user: User = Relationship(back_populates="oauth_accounts")


class AccessToken(SQLModel, table=True):
    """Store one revocable FastAPI Users browser access token."""

    __tablename__: ClassVar[str] = "access_tokens"

    # Token identity
    token: str = Field(primary_key=True, max_length=43)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True, ondelete="CASCADE")

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, index=True, sa_type=UTCDateTime)
