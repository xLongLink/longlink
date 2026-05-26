from datetime import datetime, timezone
from sqlmodel import Field, SQLModel


class Base(SQLModel):
    """Shared model base with audit fields."""

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={'onupdate': lambda: datetime.now(timezone.utc)},
    )
    deleted_at: datetime | None = None
