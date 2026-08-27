from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, get_session
from src.database.services import operations
from src.models.operations import OperationResponse
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.operations import Operation

router = APIRouter(dependencies=[Depends(authadmin)])


@router.get("/operations", response_model=Page[OperationResponse])
async def list_operations(pagination: Pagination = Depends(), session: AsyncSession = Depends(get_session)):
    """Return Platform reconciliation history for administrators."""

    items, total = await operations.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.get("/operations/{operation_id}/logs", response_model=list[str])
async def get_operation_logs(operation_id: UUID, session: AsyncSession = Depends(get_session)):
    """Return the terminal log output for one Platform operation."""

    # Resolve the persisted operation before exposing its captured log output.
    operation = await session.get(Operation, operation_id)
    if operation is None:
        raise HTTPException(status_code=404, detail="Operation not found")
    return operation.logs
