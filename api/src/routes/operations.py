from fastapi import Depends, APIRouter
from src.auth import authsupport
from src.database.services import operations
from src.models.operations import OperationResponse
from src.database.models.users import User

router = APIRouter()


@router.get("/api/operations", response_model=list[OperationResponse])
async def list_operations(_user: User = Depends(authsupport)):
    """Return all recorded long-running operations."""

    return await operations.fetch()
