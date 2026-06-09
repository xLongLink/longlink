import src.db as db
from fastapi import Depends

from src.auth import authadmin
from src.models import OperationResponse
from src.router import router


@router.get("/api/operations", response_model=list[OperationResponse])
async def list_operations(_user: db.User = Depends(authadmin)) -> list[OperationResponse]:
    """Return all recorded long-running operations."""

    return await db.operations.list()
