from datetime import datetime, timezone, UTC
from sqlmodel import Field, SQLModel

fn = lambda: datetime.now(UTC)


class Base(SQLModel):
    """Shared model base with audit fields."""

    created_at: datetime = Field(default_factory=fn)
    updated_at: datetime = Field(default_factory=fn, sa_column_kwargs={'onupdate': fn})
    deleted_at: datetime | None = None
