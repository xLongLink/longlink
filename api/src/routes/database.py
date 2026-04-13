import src.db as db
import psycopg2
from fastapi import HTTPException
from src.router import router
from src.models.databases import (DatabaseUsageSummary, DatabaseConfigSummary,
                                  DatabaseCreateResponse,
                                  DatabaseSummaryResponse)


@router.get('/database')
async def get_database_summary() -> DatabaseSummaryResponse:
    try:
        config = db.databases.get_config()
    except ValueError:
        return DatabaseSummaryResponse(configured=False)

    usage = DatabaseUsageSummary()
    try:
        measured = await db.databases.usage()
        usage = DatabaseUsageSummary(used_bytes=measured.used_bytes, free_bytes=measured.free_bytes)
    except (ValueError, psycopg2.Error):
        usage = DatabaseUsageSummary()

    return DatabaseSummaryResponse(
        configured=True,
        config=DatabaseConfigSummary(
            host=config.host,
            port=config.port,
            username=config.username,
            maintenance_database=config.maintenance_database,
            sslmode=config.sslmode,
        ),
        usage=usage,
    )


@router.post('/database/{database_name}')
async def create_database(database_name: str) -> DatabaseCreateResponse:
    try:
        await db.databases.create_database(database_name=database_name)
    except ValueError as error:
        detail = str(error)
        status_code = 400
        if 'not configured' in detail:
            status_code = 503
        raise HTTPException(status_code=status_code, detail=detail) from error
    except psycopg2.Error as error:
        raise HTTPException(status_code=502, detail=f'Unable to create database: {error.pgerror or str(error)}') from error

    return DatabaseCreateResponse(database=database_name)
