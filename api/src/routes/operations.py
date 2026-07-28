from fastapi import Depends, APIRouter
from src.auth import authadmin
from src.database.services import operations
from src.models.operations import OperationResponse

router = APIRouter(dependencies=[Depends(authadmin)])


@router.get("/api/operations", response_model=list[OperationResponse])
async def list_operations():
    """Return Platform reconciliation history for administrators."""

    return await operations.fetch()
