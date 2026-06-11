from datetime import datetime
from sqlmodel import Field, SQLModel
from .__base__ import utcnow
from sqlalchemy import Enum, Column, String
from src.models.operations import OperationStatus


class Operation(SQLModel, table=True):
    """Represent one long-running platform operation."""

    __tablename__ = "operations"

    id: int | None = Field(default=None, primary_key=True)
    kind: str = Field(max_length=100)
    app_id: int | None = Field(default=None, foreign_key="apps.id")
    registry_id: int | None = Field(default=None, foreign_key="compute_registries.id")
    status: OperationStatus = Field(
        default=OperationStatus.scheduled,
        sa_column=Column(Enum(OperationStatus, name="operation_status_enum", native_enum=False), nullable=False),
    )
    error: str | None = Field(default=None, sa_column=Column(String(length=2000), nullable=True))
    created_at: datetime = Field(default_factory=utcnow)
    started_at: datetime | None = None
    stopped_at: datetime | None = None
