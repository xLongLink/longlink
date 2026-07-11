from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Column, String
from tenant.utils import utcnow
from src.models.operations import OperationKind, OperationStatus
from tenant.database.types import UTCDateTime


class Operation(SQLModel, table=True):
    """Represent one long-running platform operation."""

    __tablename__: ClassVar[str] = "operations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # State
    kind: OperationKind = Field(
        sa_column=Column(
            Enum(
                OperationKind,
                name="operation_kind_enum",
                native_enum=False,
                values_callable=lambda items: [item.value for item in items],
                create_constraint=True,
            ),
            nullable=False,
        )
    )

    # Reference
    application_id: UUID | None = Field(default=None, foreign_key="applications.id")
    organization_id: UUID | None = Field(default=None, foreign_key="organizations.id")

    # Metadata
    error: str | None = Field(default=None, sa_column=Column(String(length=2000), nullable=True))

    # Lease
    lease_token: str | None = Field(default=None, sa_column=Column(String(length=100), nullable=True))
    lease_expires_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False))
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    scheduled_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(UTCDateTime(), nullable=False, onupdate=utcnow))
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    started_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))
    stopped_at: datetime | None = Field(default=None, sa_column=Column(UTCDateTime(), nullable=True))

    @property
    def status(self) -> OperationStatus:
        """Return the derived operation lifecycle state."""

        # Stopped operations are terminal.
        if self.stopped_at is not None:

            # Preserve error states as failed terminal operations.
            if self.error is not None:
                return OperationStatus.failed

            return OperationStatus.completed

        # Started operations are active until they stop.
        if self.started_at is not None:
            return OperationStatus.active

        return OperationStatus.scheduled
