import pytest
import logging
from longlink.logger import ApiAccessFilter


@pytest.mark.parametrize(
    ("method", "path", "expected"),
    [
        pytest.param("GET", "/api/items", True, id="api-read"),
        pytest.param("GET", "/assets/app.js", False, id="frontend-read"),
        pytest.param("POST", "/submit", True, id="mutation"),
    ],
)
def test_api_access_filter_keeps_mutations_and_api_reads_only(method: str, path: str, expected: bool) -> None:
    """Filter access logs to hide frontend asset noise."""

    # Arrange
    access_filter = ApiAccessFilter()
    record = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", ("127.0.0.1", method, path), None)

    # Act
    result = access_filter.filter(record)

    # Assert
    assert result is expected
