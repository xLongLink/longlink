import pytest
from datetime import UTC, datetime, timezone, timedelta
from longlink.database.types import UTCDateTime
from sqlalchemy.engine.default import DefaultDialect


def test_utc_datetime_normalizes_aware_database_results_to_utc() -> None:
    """Return timezone-aware database values in UTC."""

    # Arrange
    value = datetime(2026, 8, 22, 12, tzinfo=timezone(timedelta(hours=2)))

    # Act
    result = UTCDateTime().process_result_value(value, DefaultDialect())

    # Assert
    assert result == datetime(2026, 8, 22, 10, tzinfo=UTC)


def test_utc_datetime_marks_naive_database_results_as_utc() -> None:
    """Treat timezone-less SQLite database values as UTC."""

    # Arrange
    value = datetime(2026, 8, 22, 10)

    # Act
    result = UTCDateTime().process_result_value(value, DefaultDialect())

    # Assert
    assert result == datetime(2026, 8, 22, 10, tzinfo=UTC)


def test_utc_datetime_normalizes_aware_values_before_writing() -> None:
    """Store aware application values in UTC."""

    # Arrange
    value = datetime(2026, 8, 22, 12, tzinfo=timezone(timedelta(hours=2)))

    # Act
    result = UTCDateTime().process_bind_param(value, DefaultDialect())

    # Assert
    assert result == datetime(2026, 8, 22, 10, tzinfo=UTC)


def test_utc_datetime_rejects_naive_values_before_writing() -> None:
    """Reject ambiguous application timestamps before database storage."""

    # Arrange
    value = datetime(2026, 8, 22, 10)

    # Act and assert
    with pytest.raises(ValueError, match="LongLink timestamps must include a timezone"):
        UTCDateTime().process_bind_param(value, DefaultDialect())


def test_utc_datetime_preserves_null_values_before_writing() -> None:
    """Preserve nullable timestamps before database storage."""

    # Act
    result = UTCDateTime().process_bind_param(None, DefaultDialect())

    # Assert
    assert result is None
