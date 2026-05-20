import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser

router = APIRouter(prefix="/api/orgs/{organization}")


@router.get("/people")
async def list_people(organization: str, _: db.User = Depends(authuser)) -> list[dict]:
    """Return the people visible in one organization."""

    users = await db.users.list()
    return [user.model_dump() for user in users]
