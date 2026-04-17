import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models.users import UserResponse

router = APIRouter()


@router.get("/users")
async def list_users(_: db.User = Depends(authuser)) -> list[UserResponse]:
    """Return all registered users. Requires authentication."""
    users = await db.users.list()
    return [
        UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            avatar=user.avatar,
            oidc_subject=user.oidc_subject,
        )
        for user in users
    ]
