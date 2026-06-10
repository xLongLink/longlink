from datetime import UTC, datetime
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(UTC)


class Base(SQLModel):
    """Shared model base with audit fields."""

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow, sa_column_kwargs={'onupdate': utcnow})
    deleted_at: datetime | None = None
