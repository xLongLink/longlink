import sqlalchemy
from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Enum, Index, Column, Computed
from longlink.utils.time import utcnow
from src.models.operations import OperationKind, OperationStatus
from longlink.database.types import UTCDateTime
from src.database.models.base import PlatformModel


class Operation(PlatformModel, table=True):
    """Persist one durable Platform request and its expiring worker lock."""

    __tablename__: ClassVar[str] = "operations"
    __table_args__ = (
        Index(
            "ix_operations_queue",
            "kind",
            "target_id",
            "finished_at",
            "lease_expires_at",
        ),
        Index(
            "uq_operations_unleased_target",
            "kind",
            "unleased_target_id",
            unique=True,
        ),
    )

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
    target_id: UUID

    # State
    failed: str | None = Field(default=None, min_length=1, max_length=500)
    logs: list[str] = Field(default_factory=list, sa_column=Column(sqlalchemy.JSON, nullable=False))

    # Lock
    lease_expires_at: datetime | None = Field(default=None, sa_type=UTCDateTime)

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    finished_at: datetime | None = Field(default=None, sa_type=UTCDateTime)
    unleased_target_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            "unleased_target_id",
            sqlalchemy.Uuid(),
            Computed("CASE WHEN finished_at IS NULL AND lease_expires_at IS NULL THEN target_id ELSE NULL END"),
            nullable=True,
        ),
    )

    @property
    def status(self) -> OperationStatus:
        """Derive lifecycle state from terminal state and the current lease expiry."""

        # Finished operations are terminal.
        if self.finished_at is not None:
            return OperationStatus.failed if self.failed else OperationStatus.completed

        # An unexpired lease identifies the currently active attempt.
        if self.lease_expires_at is not None and self.lease_expires_at > utcnow():
            return OperationStatus.active

        return OperationStatus.scheduled
