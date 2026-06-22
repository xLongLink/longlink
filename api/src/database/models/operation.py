from datetime import datetime
from uuid import UUID
from uuid import uuid4
from sqlalchemy import Enum, Column, String
from sqlmodel import Field
from src.models.operations import OperationKind
from src.database.models.__base__ import Base, utcnow


class Operation(Base, table=True):
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
    created_at: datetime = Field(default_factory=utcnow)
    created_id: UUID | None = Field(default=None, foreign_key='users.id')
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key='users.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_id: UUID | None = Field(default=None, foreign_key='users.id')
    started_at: datetime | None = None
    stopped_at: datetime | None = None


    @property
    def status(self) -> str:
        """Return the derived operation lifecycle state."""

        if self.stopped_at is not None:
            if self.error is not None:
                return "failed"

            return "completed"

        if self.started_at is not None:
            return "active"

        return "scheduled"
