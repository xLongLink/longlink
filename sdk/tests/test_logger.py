import pytest
import logging
from longlink.logger import ColorFormatter, ApiAccessFilter, configure_logger


@pytest.mark.parametrize(
    ("args", "expected"),
    [
        pytest.param(("127.0.0.1", "GET", "/api/items"), True, id="api-read"),
        pytest.param(("127.0.0.1", "GET", "/assets/app.js"), False, id="frontend-read"),
        pytest.param(("127.0.0.1", "POST", "/submit"), True, id="mutation"),
        pytest.param({"path": "/assets/app.js"}, True, id="mapping-arguments"),
        pytest.param(("127.0.0.1", "GET"), True, id="incomplete-arguments"),
    ],
)
def test_api_access_filter_keeps_expected_access_records(
    args: tuple[str, ...] | dict[str, str],
    expected: bool,
) -> None:
    """Filter access logs to hide frontend asset noise."""

    # Arrange
    access_filter = ApiAccessFilter()
    record = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, "", (), None)
    record.args = args

    # Assert
    assert access_filter.filter(record) is expected


def test_color_formatter_restores_info_record_level_name() -> None:
    """Color INFO output without mutating the shared log record."""

    # Arrange
    formatter = ColorFormatter("%(levelname)s: %(message)s")
    record = logging.LogRecord("longlink", logging.INFO, __file__, 1, "ready", (), None)

    # Act
    output = formatter.format(record)

    # Assert
    assert output == "\x1b[32mINFO\x1b[0m: ready"
    assert record.levelname == "INFO"


@pytest.fixture
def resettable_logger(monkeypatch: pytest.MonkeyPatch) -> logging.Logger:
    """Provide an isolated logger with no initial handlers."""

    # Reset shared logger state so each policy case starts unconfigured.
    logger = logging.getLogger("longlink.tests.configure")
    monkeypatch.setattr(logger, "handlers", [])
    monkeypatch.setattr(logger, "level", logging.NOTSET)
    monkeypatch.setattr(logger, "propagate", True)
    return logger


def test_configure_logger_reuses_existing_handler(resettable_logger: logging.Logger) -> None:
    """Apply logger policy without adding a duplicate existing handler."""

    # Arrange
    logger = resettable_logger
    handler = logging.StreamHandler()
    logger.addHandler(handler)

    # Act
    configured_logger = configure_logger(logger.name)

    # Assert
    assert configured_logger is logger
    assert logger.handlers == [handler]
    assert logger.level == logging.INFO
    assert logger.propagate is False


def test_configure_logger_adds_configured_handler_when_logger_has_none(resettable_logger: logging.Logger) -> None:
    """Install one formatted stream handler for an otherwise unconfigured logger."""

    # Arrange
    logger = resettable_logger

    # Act
    configured_logger = configure_logger(logger.name)

    # Assert
    assert configured_logger is logger
    assert len(logger.handlers) == 1
    assert isinstance(logger.handlers[0], logging.StreamHandler)
    assert isinstance(logger.handlers[0].formatter, ColorFormatter)
    assert logger.level == logging.INFO
    assert logger.propagate is False
