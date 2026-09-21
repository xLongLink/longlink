from uuid import UUID, uuid4
from typing import ClassVar
from secrets import token_urlsafe
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Enum, Column, BigInteger
from src.environments import env
from src.database.types import EncryptedType
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

    # Infrastructure
    compute_id: UUID = Field(foreign_key="compute_registries.id", index=True)

    # Database
    database_password: str = Field(default_factory=token_urlsafe, sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))
    database_size_mib: int = Field(default=100, ge=100)
    database_instances: int = Field(default=1, ge=1)
    database_state: DatabaseState = Field(
        default=DatabaseState.failed,
        sa_column=Column(
            Enum(DatabaseState, name="database_state_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )
    # Storage
    storage_quota_bytes: int = Field(default=1073741824, ge=1073741824, sa_type=BigInteger)

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
