from longlink.app import LongLink
from longlink.router import Router
from longlink.auth import CurrentUser, get_user, require_role
from longlink.storage import create_fs, create_shared_fs
from longlink.database import User, create_db
from longlink.utils.xml import Element, Longlink
from longlink.utils.settings import Envs
from longlink.utils.environments import Environments

__all__ = [
    "LongLink",
    "Router",
    "CurrentUser",
    "User",
    "Element",
    "Longlink",
    "Envs",
    "Environments",
    "create_db",
    "create_fs",
    "create_shared_fs",
    "get_user",
    "require_role",
    "db",
    "env",
    "fs",
    "shared_fs",
]

env = Envs()
fs = create_fs(env)
shared_fs = create_shared_fs(env)
db = create_db(env)
