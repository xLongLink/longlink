from src import auth
from fastapi import Query, Depends, APIRouter
from collections.abc import Sequence
from src.models.solutions import SolutionResponse
from src.database.services import solutions
from src.models.pagination import Page, Pagination
from src.database.models.solutions import Solution

router = APIRouter()


@router.get("/solutions", response_model=Page[SolutionResponse])
async def list_solutions(
    session: auth.Session, pagination: Pagination = Depends(), search: str = Query(default="", max_length=200)
) -> dict[str, Sequence[Solution] | int]:
    """Return all solutions for administrator views."""

    # Search the full administrator listing before pagination.
    items, total = await solutions.fetch(session, pagination, search.strip())
    return {"items": items, "total": total}
