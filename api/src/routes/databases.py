import src.db as db
from fastapi import HTTPException
from src.router import router
from src.models.databases import DatabaseCreate, DatabaseUpdate, DatabaseResponse

# TODO: Register database control panel