from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column, Enum as SQLEnum, String
from sqlmodel import Field, SQLModel

from .__base__ import utcnow
from src.models.operations import OperationStatus


class Operation(SQLModel, table=True):
    """Represent one long-running platform operation."""

    __tablename__ = "operations"

    id: int | None = Field(default=None, primary_key=True)
    kind: str = Field(max_length=100)
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    status: OperationStatus = Field(
        default=OperationStatus.scheduled,
        sa_column=Column(SQLEnum(OperationStatus, name="operation_status_enum", native_enum=False), nullable=False),
    )
    error: str | None = Field(default=None, sa_column=Column(String(length=2000), nullable=True))
    created_at: datetime = Field(default_factory=utcnow)
    started_at: datetime | None = None
    stopped_at: datetime | None = None
