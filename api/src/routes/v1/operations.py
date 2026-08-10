from fastapi import Depends, APIRouter
from src.auth import authadmin, get_session
from src.database.services import operations
from src.models.operations import OperationResponse
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(dependencies=[Depends(authadmin)])


@router.get("/operations", response_model=list[OperationResponse])
async def list_operations(session: AsyncSession = Depends(get_session)):
    """Return Platform reconciliation history for administrators."""

    return await operations.fetch(session)
