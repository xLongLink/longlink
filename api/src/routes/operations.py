from fastapi import Depends, APIRouter
from src.auth import authsupport
from src.database.services import operations
from src.models.operations import OperationResponse
from src.database.models.users import User
from src.database.models.operations import Operation

router = APIRouter()


@router.get("/api/operations", response_model=list[OperationResponse])
async def list_operations(_: User = Depends(authsupport)) -> list[Operation]:
    """Return all recorded long-running operations."""

    records = await operations.fetch_all()
    return records
