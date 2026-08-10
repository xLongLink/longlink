import copy
import logging
from uvicorn.config import LOGGING_CONFIG

# Copy uvicorn's logging defaults before applying LongLink-specific policies.
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

        # Extract normalized request metadata from uvicorn access-log arguments.
        method = str(record.args[1]).upper()
        path = str(record.args[2]).split("?", 1)[0]

        # Always show mutating and API requests while hiding frontend and asset requests.
        return method in self._allowed_methods or path.startswith(self._allowed_prefixes)


def configure_logger(name: str) -> logging.Logger:
    """Return a stream-configured LongLink logger."""

    # Resolve the requested logger and install a fallback handler when needed.
    configured = logging.getLogger(name)
    if not configured.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(ColorFormatter("%(levelname)s:     %(message)s"))
        configured.addHandler(handler)

    # Finalize the logger's level and propagation policy.
    configured.setLevel(logging.INFO)
    configured.propagate = False

    return configured


# Configure uvicorn's default and access-log formatting.
log_config["formatters"]["default"] = {
    "()": ColorFormatter,
    "fmt": "%(levelname)s:     %(message)s",
}
log_config["formatters"]["access"] = {
    "()": ColorFormatter,
    "fmt": "%(levelname)s:     %(message)s",
}

# Keep uvicorn access logs focused on application API traffic.
log_config.setdefault("filters", {})["api_access"] = {"()": ApiAccessFilter}
log_config["handlers"]["access"]["filters"] = ["api_access"]


# Configure the shared LongLink application logger.
logger = configure_logger("longlink")
