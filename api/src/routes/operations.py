from fastapi import Depends, APIRouter
from src.auth import authsupport
from src.models.operations import OperationResponse
from src.database.models.users import User
from src.database.services.operations import operations


router = APIRouter()


@router.get("/api/operations", response_model=list[OperationResponse])
async def list_operations(_: User = Depends(authsupport)) -> list[OperationResponse]:
    """Return all recorded long-running operations."""

    return await operations.list()
