import copy
import logging
from uvicorn.config import LOGGING_CONFIG
from uvicorn.logging import DefaultFormatter

logger = logging.getLogger("longlink")

log_config = copy.deepcopy(LOGGING_CONFIG)


class ApiAccessFilter(logging.Filter):
    """Allow access logs for application requests while hiding frontend noise."""

    _allowed_prefixes = ("/api/", "/auth/")

    def filter(self, record: logging.LogRecord) -> bool:
        """Return True when the request should remain visible in access logs."""

        if len(record.args) < 3:
            return True

        path = str(record.args[2]).split("?", 1)[0]

        if not path.startswith(self._allowed_prefixes):
            return False

        return True


log_config.setdefault("filters", {})["api_access"] = {"()": ApiAccessFilter}
log_config["handlers"]["access"]["filters"] = ["api_access"]

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(DefaultFormatter(fmt="%(levelprefix)s %(message)s", use_colors=None))
    logger.addHandler(handler)

logger.setLevel(logging.INFO)
logger.propagate = False
