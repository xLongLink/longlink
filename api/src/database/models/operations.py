from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Enum, Index, Column
from src.models.types import PlatformVersion
from src.database.types import PlatformVersionType
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
            "platform_version",
            "finished_at",
            "lease_expires_at",
            "created_at",
            "id",
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
    target_id: UUID = Field(nullable=False)

    # State
    failed: bool = Field(default=False, nullable=False)
    platform_version: PlatformVersion = Field(sa_column=Column(PlatformVersionType(), nullable=False))

    # Lock
    lease_expires_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    finished_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)

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
