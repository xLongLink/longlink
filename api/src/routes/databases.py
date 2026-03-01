from fastapi import HTTPException

import src.db as db
from src.models.databases import DatabaseCreate, DatabaseResponse, DatabaseUpdate
from src.router import router


def to_response(database: db.Database) -> DatabaseResponse:
    return DatabaseResponse(
        id=database.id,
        type=database.type,
        host=database.host,
        port=database.port,
        name=database.name,
        username=database.username,
        password=database.password,
        connection_url=f'{database.type}://{database.username}:{database.password}@{database.host}:{database.port}/{database.name}',
    )


@router.get('/databases')
async def list_databases() -> list[DatabaseResponse]:
    databases = await db.databases.list()
    return [to_response(database) for database in databases]


@router.post('/databases')
async def create_database(payload: DatabaseCreate) -> DatabaseResponse:
    database = await db.databases.create(
        type=payload.type,
        host=payload.host,
        port=payload.port,
        name=payload.name,
        username=payload.username,
        password=payload.password,
    )
    return to_response(database)


@router.put('/databases/{database_id}')
async def edit_database(database_id: int, payload: DatabaseUpdate) -> DatabaseResponse:
    database = await db.databases.update(
        database_id,
        type=payload.type,
        host=payload.host,
        port=payload.port,
        name=payload.name,
        username=payload.username,
        password=payload.password,
    )
    if database is None:
        raise HTTPException(status_code=404, detail='Database not found')

    return to_response(database)


@router.delete('/databases/{database_id}')
async def remove_database(database_id: int) -> dict[str, bool]:
    deleted = await db.databases.delete(database_id)
    if not deleted:
        raise HTTPException(status_code=404, detail='Database not found')

    return {'deleted': True}
