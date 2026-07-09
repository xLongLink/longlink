import logging


class ColorFormatter(logging.Formatter):
    """Format log records with ANSI colors for selected levels."""

    def format(self, record: logging.LogRecord) -> str:
        """Render INFO logs with a green level label."""

        original_levelname = record.levelname

        # Temporarily rewrite the level name so the parent formatter can colorize INFO output.
        if record.levelno == logging.INFO:
            record.levelname = "\x1b[32mINFO\x1b[0m"

        # Restore the original level label even if formatting raises.
        try:
            return super().format(record)
        finally:
            record.levelname = original_levelname


logger = logging.getLogger("longlink.operations")

# Install the shared stream handler once so repeated imports do not duplicate log lines.
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(ColorFormatter("%(levelname)s:     %(message)s"))
    logger.addHandler(handler)

logger.setLevel(logging.INFO)
logger.propagate = False
