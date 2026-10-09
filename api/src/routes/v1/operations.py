from src import auth
from fastapi import Depends, APIRouter
from src.database.services import operations
from src.models.operations import OperationResponse
from src.models.pagination import Page, Pagination

router = APIRouter(dependencies=[Depends(auth.authadmin)])


@router.get("/operations", response_model=Page[OperationResponse])
async def list_operations(session: auth.Session, pagination: Pagination = Depends()):
    """Return Platform reconciliation history for administrators."""

    items, total = await operations.fetch_page(session, pagination)
    return {"items": items, "total": total}
