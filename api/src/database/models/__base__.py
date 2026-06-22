from datetime import UTC, datetime
from sqlmodel import SQLModel


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(UTC)


class Base(SQLModel):
    """Shared model base for database rows."""
