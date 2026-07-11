from . import assets
from longlink.app import LongLink
from longlink.router import Router
from longlink.storage import create_fs
from longlink.database import User, create_db
from longlink.utils.xml import Element, Longlink
from longlink.utils.settings import Envs
from longlink.utils.environments import Environments

env = Envs()
fs = create_fs(env, env.STORAGE_BUCKET or "")
shared_fs = create_fs(env, env.STORAGE_SHARED_BUCKET or "")
db = create_db(env)
