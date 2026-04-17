import src.db as db
from fastapi import HTTPException
from src.router import router
from src.models.databases import DatabaseOverviewMetric


@router.get("/databases/overview")
async def list_database_overview_metrics() -> list[DatabaseOverviewMetric]:
    """Return database overview metrics displayed in settings UI."""
    try:
        return await db.databases.list_overview_metrics()
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to collect database overview metrics: {error}",
        ) from error
