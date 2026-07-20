from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Index, Column, String, text
from longlink.utils.time import utcnow
from src.models.operations import OperationStatus
from longlink.database.types import UTCDateTime


class Operation(SQLModel, table=True):
    """Persist one durable compute reconciliation request and its renewable worker lease.

    Each compute target admits one open request; its target release and attempt generation coordinate and fence API replicas.
    """

    __tablename__: ClassVar[str] = "operations"
    __table_args__ = (
        Index(
            "uq_operations_open_compute_id",
            "compute_id",
            unique=True,
            postgresql_where=text("stopped_at IS NULL"),
            sqlite_where=text("stopped_at IS NULL"),
        ),
    )

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Reference
    compute_id: UUID = Field(foreign_key="compute_registries.id")

    # State
    error: str | None = Field(default=None, sa_column=Column(String(length=2000), nullable=True))
    attempt_count: int = Field(default=0, nullable=False, ge=0)
    platform_version: str = Field(max_length=128)

    # Lease
    lease_expires_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    started_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    stopped_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    scheduled_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)

    @property
    def status(self) -> OperationStatus:
        """Derive lifecycle state from terminal timestamps, error state, and the current lease expiry."""

        # Stopped operations are terminal.
        if self.stopped_at is not None:
            # Preserve error states as failed terminal operations.
            if self.error is not None:
                return OperationStatus.failed

            return OperationStatus.completed

        # An unexpired lease identifies the currently active attempt.
        if self.started_at is not None and self.lease_expires_at is not None and self.lease_expires_at > utcnow():
            return OperationStatus.active

        return OperationStatus.scheduled
