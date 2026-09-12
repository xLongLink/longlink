from uuid import UUID, uuid4
from typing import ClassVar
from secrets import token_urlsafe
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Enum, Column, BigInteger
from src.environments import env
from src.database.types import EncryptedType
from longlink.utils.time import utcnow
from src.models.statuses import Status
from longlink.database.types import UTCDateTime
from src.database.models.base import PlatformModel
from src.models.organizations import DatabaseState


class Organization(PlatformModel, table=True):
    """Persist the tenant boundary and its immutable infrastructure assignments.

    A deletion tombstone remains until reconciliation removes the Organization's external resources.
    """

    __tablename__: ClassVar[str] = "organizations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(max_length=128)
    slug: str = Field(unique=True, max_length=128)
    avatar: str = Field(default="", max_length=2048)

    # Infrastructure
    compute_id: UUID = Field(foreign_key="compute_registries.id", index=True)

    # Database
    database_password: str = Field(default_factory=token_urlsafe, sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))
    database_idle_seconds: int = Field(default=0)
    database_last_active_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    database_state: DatabaseState = Field(
        default=DatabaseState.available,
        sa_column=Column(
            Enum(DatabaseState, name="database_state_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )
    database_sync_pending: bool = Field(default=True)
    database_usage_bytes: int | None = Field(default=None, sa_type=BigInteger)
    database_usage_at: datetime | None = Field(default=None, sa_type=UTCDateTime)

    # State
    status: Status = Field(
        default=Status.creating,
        sa_column=Column(
            Enum(Status, name="organization_status_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_type=UTCDateTime)
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")


class OrganizationActivity(PlatformModel, table=True):
    """Keep an Organization database awake while a bounded activity lease is live."""

    __tablename__: ClassVar[str] = "organization_activities"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Lease
    organization_id: UUID = Field(foreign_key="organizations.id", ondelete="CASCADE", index=True)
    expires_at: datetime = Field(sa_type=UTCDateTime, index=True)
