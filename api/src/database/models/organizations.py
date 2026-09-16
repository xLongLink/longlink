from uuid import UUID, uuid4
from typing import ClassVar
from secrets import token_urlsafe
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Enum, Column, Integer, BigInteger
from src.environments import env
from src.database.types import EncryptedType
from longlink.utils.time import utcnow
from src.models.statuses import Status
from longlink.database.types import UTCDateTime
from src.database.models.base import AuditTable, PlatformModel
from src.models.organizations import DatabaseState


class Organization(AuditTable, table=True):
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
    database_last_active_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    database_size_mib: int = Field(default=100, ge=100)
    database_instances: int = Field(default=1, ge=1)
    database_state: DatabaseState = Field(
        default=DatabaseState.needs_sync,
        sa_column=Column(
            Enum(DatabaseState, name="database_state_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )
    database_usage_bytes: int | None = Field(default=None, sa_type=BigInteger)
    database_idle_seconds: int = Field(
        default_factory=lambda: env.DATABASE_IDLE_SECONDS,
        ge=0,
        le=604800,
        sa_column=Column(Integer, nullable=False, server_default="300"),
    )

    # Storage
    storage_quota_bytes: int = Field(default=1073741824, ge=1073741824, sa_type=BigInteger)

    # Compute
    compute_cpu_limit: int = Field(default=4, ge=4)
    compute_memory_limit_gib: int = Field(default=3, ge=3)
    compute_ephemeral_limit_gib: int = Field(default=4, ge=4)
    compute_pods: int = Field(default=8, ge=8)

    # State
    status: Status = Field(
        default=Status.creating,
        sa_column=Column(
            Enum(Status, name="organization_status_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )


class OrganizationActivity(PlatformModel, table=True):
    """Keep an Organization database awake while a bounded activity lease is live."""

    __tablename__: ClassVar[str] = "organization_activities"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Lease
    organization_id: UUID = Field(foreign_key="organizations.id", ondelete="CASCADE", index=True)
    expires_at: datetime = Field(sa_type=UTCDateTime)
