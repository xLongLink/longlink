import logging

from longlink.logger import ApiAccessFilter, ColorFormatter


def test_color_formatter_restores_record_level_name() -> None:
    """Restore the original level name after formatting colored INFO logs."""

    record = logging.LogRecord("longlink", logging.INFO, __file__, 1, "message", (), None)
    formatter = ColorFormatter("%(levelname)s:%(message)s")

    rendered = formatter.format(record)

    assert "\x1b[32mINFO\x1b[0m:message" == rendered
    assert record.levelname == "INFO"


def test_api_access_filter_keeps_mutations_and_api_reads_only() -> None:
    """Filter access logs to hide frontend asset noise."""

    access_filter = ApiAccessFilter()
    api_read = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", ("127.0.0.1", "GET", "/api/items"), None)
    frontend_read = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", ("127.0.0.1", "GET", "/assets/app.js"), None)
    mutation = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", ("127.0.0.1", "POST", "/submit"), None)

    assert access_filter.filter(api_read)
    assert not access_filter.filter(frontend_read)
    assert access_filter.filter(mutation)
