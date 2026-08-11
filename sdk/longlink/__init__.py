from . import database
from .app import LongLink
from .utils.xml import Element
from .storage.base import create_fs as _create_fs
from .utils.settings import Envs
from .utils.environments import Environments

storage = _create_fs()
