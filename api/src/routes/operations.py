from fastapi import Depends

from src.auth import authsupport
from src.database.models.users import User
from src.database.services.operations import operations
from src.router import router
from src.models.operations import OperationResponse


@router.get("/api/operations", response_model=list[OperationResponse])
async def list_operations(_user: User = Depends(authsupport)) -> list[OperationResponse]:
    """Return all recorded long-running operations."""

    return await operations.list()
