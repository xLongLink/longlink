import logging


class ColorFormatter(logging.Formatter):
    """Format log records with ANSI colors for selected levels."""

    def format(self, record: logging.LogRecord) -> str:
        """Render INFO logs with a green level label."""

        original_levelname = record.levelname
        if record.levelno == logging.INFO:
            record.levelname = "\x1b[32mINFO\x1b[0m"

        try:
            return super().format(record)
        finally:
            record.levelname = original_levelname


logger = logging.getLogger("longlink.operations")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(ColorFormatter("%(levelname)s:     %(message)s"))
    logger.addHandler(handler)

logger.setLevel(logging.INFO)
logger.propagate = False
