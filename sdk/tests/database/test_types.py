import pytest
from datetime import UTC, datetime, timezone, timedelta
from longlink.database.types import UTCDateTime
from sqlalchemy.engine.default import DefaultDialect


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        pytest.param(
            datetime(2026, 8, 22, 12, tzinfo=timezone(timedelta(hours=2))),
            datetime(2026, 8, 22, 10, tzinfo=UTC),
            id="aware-value",
        ),
        pytest.param(datetime(2026, 8, 22, 10), datetime(2026, 8, 22, 10, tzinfo=UTC), id="naive-value"),
    ],
)
def test_utc_datetime_normalizes_database_results_to_utc(value: datetime, expected: datetime) -> None:
    """Return database values as timezone-aware UTC datetimes."""

    # Act
    result = UTCDateTime().process_result_value(value, DefaultDialect())

    # Assert
    assert result == expected


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
