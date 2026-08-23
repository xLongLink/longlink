from datetime import UTC
from longlink.utils.time import utcnow


def test_utcnow_returns_an_aware_utc_timestamp() -> None:
    """Return timestamps explicitly anchored to UTC."""

    # Act
    timestamp = utcnow()

    # Assert
    assert timestamp.tzinfo is UTC
