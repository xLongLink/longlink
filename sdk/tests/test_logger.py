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
def isolated_logger(monkeypatch: pytest.MonkeyPatch) -> logging.Logger:
    """Provide an isolated logger with no initial handlers."""

    # Exercise logger policy without registering or resetting shared logger state.
    logger = logging.Logger("longlink.tests.configure")
    get_logger = logging.getLogger
    monkeypatch.setattr(logging, "getLogger", lambda name=None: logger if name == logger.name else get_logger(name))
    return logger


def test_configure_logger_reuses_existing_handler(isolated_logger: logging.Logger) -> None:
    """Apply logger policy without adding a duplicate existing handler."""

    # Arrange
    handler = logging.StreamHandler()
    isolated_logger.addHandler(handler)

    # Act
    configured_logger = configure_logger(isolated_logger.name)

    # Assert
    assert configured_logger is isolated_logger
    assert isolated_logger.handlers == [handler]
    assert isolated_logger.level == logging.INFO
    assert isolated_logger.propagate is False


def test_configure_logger_adds_configured_handler_when_logger_has_none(isolated_logger: logging.Logger) -> None:
    """Install one formatted stream handler for an otherwise unconfigured logger."""

    # Act
    configured_logger = configure_logger(isolated_logger.name)

    # Assert
    assert configured_logger is isolated_logger
    assert len(isolated_logger.handlers) == 1
    assert isinstance(isolated_logger.handlers[0], logging.StreamHandler)
    assert isinstance(isolated_logger.handlers[0].formatter, ColorFormatter)
