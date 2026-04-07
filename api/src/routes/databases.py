import src.db as db
import psycopg2
from fastapi import HTTPException
from src.router import router
from src.models.databases import (DatabaseCreateResponse,
                                  DatabaseConnectionCreate,
                                  DatabaseConnectionDelete,
                                  DatabaseConnectionResponse)


@router.get('/databases')
async def list_databases() -> list[DatabaseConnectionResponse]:
    connections = await db.databases.list()
    return [
        DatabaseConnectionResponse(
            name=connection.name,
            host=connection.host,
            port=connection.port,
            username=connection.username,
            maintenance_database=connection.maintenance_database,
            sslmode=connection.sslmode,
        )
        for connection in connections
    ]


@router.post('/databases')
async def set_database_connection(payload: DatabaseConnectionCreate) -> DatabaseConnectionResponse:
    connection = await db.databases.set(
        name=payload.name,
        host=payload.host,
        port=payload.port,
        username=payload.username,
        password=payload.password,
        maintenance_database=payload.maintenance_database,
        sslmode=payload.sslmode,
    )

    return DatabaseConnectionResponse(
        name=connection.name,
        host=connection.host,
        port=connection.port,
        username=connection.username,
        maintenance_database=connection.maintenance_database,
        sslmode=connection.sslmode,
    )


@router.delete('/databases')
async def delete_database_connection(payload: DatabaseConnectionDelete) -> dict[str, str]:
    deleted = await db.databases.delete(payload.name)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Database connection '{payload.name}' not found")

    return {'status': 'deleted'}


@router.post('/databases/{database_name}')
async def create_database(database_name: str, connection_name: str = 'default') -> DatabaseCreateResponse:
    connection = await db.databases.get(connection_name)
    if connection is None:
        raise HTTPException(status_code=404, detail=f"Database connection '{connection_name}' not found")

    try:
        await db.databases.create_database(connection=connection, database_name=database_name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except psycopg2.Error as error:
        raise HTTPException(status_code=502, detail=f'Unable to create database: {error.pgerror or str(error)}') from error

    return DatabaseCreateResponse(database=database_name, connection_name=connection_name)
