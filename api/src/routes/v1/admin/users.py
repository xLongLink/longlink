from src import auth
from fastapi import Query, Depends, APIRouter
from src.models.users import AdminUserSummary
from src.database.services import users
from src.models.pagination import Page, Pagination

router = APIRouter()


@router.get("/users", response_model=Page[AdminUserSummary])
async def list_users(session: auth.Session, pagination: Pagination = Depends(), search: str = Query(default="", max_length=200)):
    """Return all user summaries for administrator views."""

    # Search the full administrator listing before pagination.
    items, total = await users.fetch(session, pagination, search.strip())
    return {"items": items, "total": total}
