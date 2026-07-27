from fastapi import APIRouter
from sqlalchemy import text
from src.database.session import session_scope

router = APIRouter()


@router.get("/api/healthz", response_model=dict[str, bool])
async def healthz():
    """Return a simple liveness response."""

    return {"alive": True}


@router.get("/api/readyz", response_model=dict[str, bool])
async def readyz():
    """Return readiness after verifying Platform database connectivity."""

    # Require a live database connection before routing requests to this replica.
    async with session_scope() as session:
        await session.execute(text("SELECT 1"))

    return {"ready": True}
