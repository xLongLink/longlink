from datetime import datetime
from sqlmodel import Field, SQLModel
from .__base__ import utcnow
from sqlalchemy import Enum, Column, String
from src.models.operations import OperationKind
from src.database.models.__base__ import new_id


class Operation(SQLModel, table=True):
    """Represent one long-running platform operation."""

    __tablename__ = "operations"

    # Identifier
    id: str = Field(default_factory=new_id, primary_key=True, max_length=12)

    # State
    kind: OperationKind = Field(sa_column=Column(Enum(OperationKind, name="operation_kind_enum", native_enum=False, values_callable=lambda items: [item.value for item in items], create_constraint=True), nullable=False))

    # Reference
    application_id: str | None = Field(default=None, foreign_key="applications.id", max_length=12)

    # Metadata
    step: str = Field(sa_column=Column(String(length=100), nullable=False))
    error: str | None = Field(default=None, sa_column=Column(String(length=2000), nullable=True))

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow)
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
