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
