from fastapi import Depends, APIRouter
from src.auth import authadmin, get_session
from src.database.services import operations
from src.models.operations import OperationResponse
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(dependencies=[Depends(authadmin)])


@router.get("/operations", response_model=Page[OperationResponse])
async def list_operations(pagination: Pagination = Depends(), session: AsyncSession = Depends(get_session)):
    """Return Platform reconciliation history for administrators."""

    items, total = await operations.fetch_page(session, pagination)
    return Page(items=list(items), page=pagination.page, page_size=pagination.page_size, total=total)
