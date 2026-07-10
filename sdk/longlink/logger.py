import copy
import logging
from uvicorn.config import LOGGING_CONFIG

logger = logging.getLogger("longlink")

log_config = copy.deepcopy(LOGGING_CONFIG)


class ColorFormatter(logging.Formatter):
    """Format log records with ANSI colors for selected levels."""

    def format(self, record: logging.LogRecord) -> str:
        """Render INFO logs with a green level label."""

        original_levelname = record.levelname

        # Temporarily rewrite the level name so the parent formatter can colorize INFO output.
        if record.levelno == logging.INFO:
            record.levelname = "\x1b[32mINFO\x1b[0m"

        # Delegate formatting after any temporary level-name rewrite.
        try:
            return super().format(record)

        # Restore the original level label even if formatting raises.
        finally:
            record.levelname = original_levelname


class ApiAccessFilter(logging.Filter):
    """Allow access logs for application requests while hiding frontend noise."""

    _allowed_prefixes = ("/api/",)
    _allowed_methods = ("POST", "PUT", "PATCH", "DELETE")

    def filter(self, record: logging.LogRecord) -> bool:
        """Return True when the request should remain visible in access logs."""

        # Keep non-HTTP access records visible because their structure is unknown.
        if not isinstance(record.args, tuple) or len(record.args) < 3:
            return True

        method = str(record.args[1]).upper()
        path = str(record.args[2]).split("?", 1)[0]

        # Always show mutating requests because they are operationally important.
        if method in self._allowed_methods:
            return True

        # Hide frontend and asset requests so access logs stay focused on application APIs.
        if not path.startswith(self._allowed_prefixes):
            return False

        return True


log_config["formatters"]["default"] = {
    "()": ColorFormatter,
    "fmt": "%(levelname)s:     %(message)s",
}
log_config["formatters"]["access"] = {
    "()": ColorFormatter,
    "fmt": "%(levelname)s:     %(message)s",
}
log_config.setdefault("filters", {})["api_access"] = {"()": ApiAccessFilter}
log_config["handlers"]["access"]["filters"] = ["api_access"]


# Install a fallback handler only when the package logger has not already been configured.
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(ColorFormatter("%(levelname)s:     %(message)s"))
    logger.addHandler(handler)

logger.setLevel(logging.INFO)
logger.propagate = False
