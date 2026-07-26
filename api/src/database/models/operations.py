from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import JSON, Enum, Index, Column, text
from longlink.utils.time import utcnow
from src.models.operations import OperationKind, OperationStatus, ReconciliationScope
from longlink.database.types import UTCDateTime


class Operation(SQLModel, table=True):
    """Persist one durable Platform reconciliation request and its worker lock.

    Each kind, target, and scope admits one open request; lock expiry and attempt generations fence API replicas.
    """

    __tablename__: ClassVar[str] = "operations"
    __table_args__ = (
        Index(
            "uq_operations_open_kind_target_scope",
            "kind",
            "target_id",
            "scope",
            unique=True,
            postgresql_where=text("stopped_at IS NULL"),
            sqlite_where=text("stopped_at IS NULL"),
        ),
    )

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Reference
    kind: OperationKind = Field(sa_column=Column(Enum(OperationKind, name="operation_kind_enum", native_enum=False), nullable=False))
    target_id: UUID = Field(nullable=False)
    compute_id: UUID = Field(foreign_key="compute_registries.id")
    application_ids: list[str] | None = Field(default=None, sa_column=Column(JSON, nullable=True))

    # State
    failed: bool = Field(default=False, nullable=False)
    scope: ReconciliationScope = Field(
        sa_column=Column(Enum(ReconciliationScope, name="reconciliation_scope_enum", native_enum=False), nullable=False)
    )
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
        """Derive lifecycle state from terminal state and the current lease expiry."""

        # Stopped operations are terminal.
        if self.stopped_at is not None:
            return OperationStatus.failed if self.failed else OperationStatus.completed

        # An unexpired lease identifies the currently active attempt.
        if self.started_at is not None and self.lease_expires_at is not None and self.lease_expires_at > utcnow():
            return OperationStatus.active

        return OperationStatus.scheduled
