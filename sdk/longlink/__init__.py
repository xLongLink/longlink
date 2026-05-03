from fastapi import APIRouter as Router
from longlink.app import LongLink
from longlink.utils import *
from longlink.storage import fs, get_fs
from longlink.database import Base, Table, Database, db, get_session
