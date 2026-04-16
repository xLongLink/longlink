import src.db as db
import psycopg2
from fastapi import HTTPException
from src.router import router
from src.models.databases import DatabaseCreateResponse


@router.post("/database/{database_name}")
async def create_database(database_name: str) -> DatabaseCreateResponse:
    """Create a new database with the given name."""
    try:
        await db.databases.create_database(database_name=database_name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except psycopg2.Error as error:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to create database: {error.pgerror or str(error)}",
        ) from error

    return DatabaseCreateResponse(database=database_name)
