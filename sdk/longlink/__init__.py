from longlink.app import LongLink
from longlink.utils import *
from longlink.router import Router
from longlink.page import page
from longlink.storage import create_fs
from longlink.database import create_db

# Initialize resouces
_env = Environments()
fs = create_fs(_env)
db = create_db(_env)
