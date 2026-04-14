import src.db as db
from src.router import router
from src.models.storages import StorageConnection


@router.get('/storage')
async def list_storages() -> list[StorageConnection]:
    return await db.storages.list()
