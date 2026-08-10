from fastapi import APIRouter
from src.database.session import session_scope
from src.database.services import database

router = APIRouter()


@router.get("/healthz", response_model=dict[str, bool])
async def healthz():
    """Return a simple liveness response."""

    return {"alive": True}


@router.get("/readyz", response_model=dict[str, bool])
async def readyz():
    """Return readiness after verifying Platform database connectivity."""

    # Require a live database connection before routing requests to this replica.
    async with session_scope() as session:
        await database.ready(session)

    return {"ready": True}
