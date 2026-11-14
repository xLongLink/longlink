from src import auth
from fastapi import Query, Depends, APIRouter
from collections.abc import Sequence
from src.database.services import operations
from src.models.operations import OperationResponse
from src.models.pagination import Page, Pagination

router = APIRouter()


@router.get("/operations", response_model=Page[OperationResponse])
async def list_operations(
    session: auth.Session, pagination: Pagination = Depends(), search: str = Query(default="", max_length=200)
) -> dict[str, Sequence[dict[str, object]] | int]:
    """Return Platform reconciliation history for administrators."""

    # Search the full administrator listing before pagination.
    items, total = await operations.fetch(session, pagination, search.strip())
    return {"items": items, "total": total}
