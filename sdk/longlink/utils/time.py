from datetime import UTC, datetime


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(UTC)
