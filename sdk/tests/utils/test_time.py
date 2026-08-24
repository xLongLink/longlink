from datetime import UTC, datetime
from longlink.utils.time import utcnow


def test_utcnow_returns_a_timezone_aware_utc_timestamp() -> None:
    """Return the current time with an explicit UTC timezone."""

    # Arrange
    before = datetime.now(UTC)

    # Act
    value = utcnow()

    # Assert
    assert value.tzinfo is UTC
    assert before <= value <= datetime.now(UTC)
