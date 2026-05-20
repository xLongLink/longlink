import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser

router = APIRouter(prefix="/api/users")


@router.get("")
async def list_users(_: db.User = Depends(authuser)) -> list[dict]:
    """Return all users in the database."""

    users = await db.users.list()
    return [user.model_dump() for user in users]
