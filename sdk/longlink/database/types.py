from datetime import UTC, datetime
from sqlalchemy import DateTime
from sqlalchemy.types import TypeDecorator
from sqlalchemy.engine.interfaces import Dialect


class UTCDateTime(TypeDecorator[datetime]):
    """Store datetimes as timezone-aware UTC values."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        """Normalize outbound datetime values before writing them."""

        # Preserve NULL timestamp values.
        if value is None:
            return None

        # Reject ambiguous Solution timestamps before database storage.
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("LongLink timestamps must include a timezone")

        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        """Normalize inbound database timestamp values after loading them."""

        # Preserve NULL timestamp values.
        if value is None:
            return None

        # SQLite can return naive datetimes even when columns are declared timezone-aware.
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=UTC)

        return value.astimezone(UTC)
