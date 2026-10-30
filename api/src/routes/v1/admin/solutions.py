from src import auth
from fastapi import Query, Depends, APIRouter
from src.models.solutions import SolutionResponse
from src.database.services import solutions
from src.models.pagination import Page, Pagination

router = APIRouter()


@router.get("/solutions", response_model=Page[SolutionResponse])
async def list_solutions(session: auth.Session, pagination: Pagination = Depends(), search: str = Query(default="", max_length=200)):
    """Return all solutions for administrator views."""

    # Search the full administrator listing before pagination.
    items, total = await solutions.fetch(session, pagination, search.strip())
    return {"items": items, "total": total}
