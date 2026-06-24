from uuid import UUID, uuid4
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Enum, Column, String
from src.models.operations import OperationKind, OperationStatus


class Operation(SQLModel, table=True):
    """Represent one long-running platform operation."""

    __tablename__ = "operations"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # State
    kind: OperationKind = Field(sa_column=Column(Enum(OperationKind, name="operation_kind_enum", native_enum=False, values_callable=lambda items: [item.value for item in items], create_constraint=True), nullable=False))

    # Reference
    application_id: UUID | None = Field(default=None, foreign_key="applications.id")

    # Metadata
    step: str = Field(sa_column=Column(String(length=100), nullable=False))
    error: str | None = Field(default=None, sa_column=Column(String(length=2000), nullable=True))

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_id: UUID | None = Field(default=None, foreign_key='users.id')
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), sa_column_kwargs={'onupdate': lambda: datetime.now(UTC)})
    updated_id: UUID | None = Field(default=None, foreign_key='users.id')
    started_at: datetime | None = None
    stopped_at: datetime | None = None

    @property
    def status(self) -> OperationStatus:
        """Return the derived operation lifecycle state."""

        if self.stopped_at is not None:
            if self.error is not None:
                return OperationStatus.failed

            return OperationStatus.completed

        if self.started_at is not None:
            return OperationStatus.active

        return OperationStatus.scheduled
