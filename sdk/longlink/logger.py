import copy
import logging

from uvicorn.config import LOGGING_CONFIG
from uvicorn.logging import DefaultFormatter

logger = logging.getLogger("longlink")

log_config = copy.deepcopy(LOGGING_CONFIG)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(DefaultFormatter(fmt="%(levelprefix)s %(message)s", use_colors=None))
    logger.addHandler(handler)

logger.setLevel(logging.INFO)
logger.propagate = False
