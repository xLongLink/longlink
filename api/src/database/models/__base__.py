from datetime import UTC, datetime
from uuid import uuid4
from sqlmodel import SQLModel


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(UTC)


def new_id() -> str:
    """Return a short hex identifier for persisted rows."""

    return uuid4().hex[:12]


class Base(SQLModel):
    """Shared model base for database rows."""
