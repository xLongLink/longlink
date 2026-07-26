from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Column
from longlink.utils.time import utcnow
from src.models.operations import OperationKind, OperationStatus
from longlink.database.types import UTCDateTime


class Operation(SQLModel, table=True):
    """Persist one durable Platform request and its expiring worker lock."""

    __tablename__: ClassVar[str] = "operations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Reference
    kind: OperationKind = Field(
        sa_column=Column(
            Enum(
                OperationKind,
                name="operation_kind_enum",
                native_enum=False,
                values_callable=lambda members: [member.value for member in members],
            ),
            nullable=False,
        )
    )
    target_id: UUID = Field(nullable=False)
    compute_id: UUID = Field(foreign_key="compute_registries.id")

    # State
    failed: bool = Field(default=False, nullable=False)
    attempt_count: int = Field(default=0, nullable=False, ge=0)
    platform_version: str = Field(max_length=128)

    # Lock
    lease_expires_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    started_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    stopped_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    scheduled_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)

    @property
    def status(self) -> OperationStatus:
        """Derive lifecycle state from terminal state and the current lease expiry."""

        # Stopped operations are terminal.
        if self.stopped_at is not None:
            return OperationStatus.failed if self.failed else OperationStatus.completed

        # An unexpired lease identifies the currently active attempt.
        if self.started_at is not None and self.lease_expires_at is not None and self.lease_expires_at > utcnow():
            return OperationStatus.active

        return OperationStatus.scheduled
