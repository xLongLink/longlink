from fastapi import APIRouter
from sqlalchemy import text
from src.database.session import session_scope

router = APIRouter()


@router.get("/healthz", response_model=dict[str, bool])
async def healthz() -> dict[str, bool]:
    """Return a simple liveness response."""

    return {"alive": True}


@router.get("/readyz", response_model=dict[str, bool])
async def readyz() -> dict[str, bool]:
    """Return readiness after verifying Platform database connectivity."""

    # Require a live database connection before routing requests to this replica.
    async with session_scope() as session:
        await session.execute(text("SELECT 1"))

    return {"ready": True}
