import logging
from longlink.logger import ApiAccessFilter


def test_api_access_filter_keeps_mutations_and_api_reads_only() -> None:
    """Filter access logs to hide frontend asset noise."""

    access_filter = ApiAccessFilter()
    api_read = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", ("127.0.0.1", "GET", "/api/items"), None)
    frontend_read = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", ("127.0.0.1", "GET", "/assets/app.js"), None)
    mutation = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", ("127.0.0.1", "POST", "/submit"), None)

    assert access_filter.filter(api_read)
    assert not access_filter.filter(frontend_read)
    assert access_filter.filter(mutation)
