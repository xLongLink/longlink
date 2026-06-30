import logging
from longlink.logger import ApiAccessFilter


def make_access_record(method: str, path: str) -> logging.LogRecord:
    """Create a uvicorn-style access log record for filter tests."""

    record = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, "", (), None)
    record.args = ("127.0.0.1:1000", method, path, "1.1", 200)

    return record


def test_api_access_filter_allows_mutating_application_routes() -> None:
    """Allow successful Action requests to appear in SDK dev logs."""

    access_filter = ApiAccessFilter()

    assert access_filter.filter(make_access_record("POST", "/form")) is True


def test_api_access_filter_hides_frontend_asset_routes() -> None:
    """Keep noisy frontend asset requests hidden in SDK dev logs."""

    access_filter = ApiAccessFilter()

    assert access_filter.filter(make_access_record("GET", "/assets/index.js")) is False
