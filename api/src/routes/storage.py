import src.db as db
from fastapi import APIRouter
from src.models.storages import StorageConnection

router = APIRouter()


@router.get("/storage")
async def list_storages() -> list[StorageConnection]:
    """Return available storage connections."""
    return await db.storages.list()
