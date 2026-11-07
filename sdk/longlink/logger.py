import copy
import logging
from uvicorn.config import LOGGING_CONFIG

# Copy uvicorn's logging defaults before applying LongLink-specific policies.
log_config = copy.deepcopy(LOGGING_CONFIG)


class ApiAccessFilter(logging.Filter):
    """Allow relevant access logs while hiding frontend and successful probe noise."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Return True when the request should remain visible in access logs."""

        # Keep non-HTTP access records visible because their structure is unknown.
        if not isinstance(record.args, tuple) or len(record.args) < 3:
            return True

        # Extract normalized request metadata from uvicorn access-log arguments.
        method = str(record.args[1]).upper()
        path = str(record.args[2]).split("?", 1)[0]

        # Hide routine successful Platform probes while retaining failures for diagnosis.
        if path in ("/api/v1/healthz", "/api/v1/readyz") and len(record.args) >= 5:
            status_code = record.args[4]
            if isinstance(status_code, int) and 200 <= status_code < 300:
                return False

        # Always show mutating and API requests while hiding frontend and asset requests.
        return method in ("POST", "PUT", "PATCH", "DELETE") or path.startswith("/api/")


# Keep uvicorn access logs focused on Solution API traffic.
log_config.setdefault("filters", {})["api_access"] = {"()": ApiAccessFilter}
log_config["handlers"]["access"]["filters"] = ["api_access"]


# Resolve the shared LongLink Solution logger without configuring its consumers.
logger = logging.getLogger("longlink")
