import src.db as db
from fastapi import Depends
from src.auth import authuser
from src.models.users import UserResponse
from src.router import router


@router.get('/users')
async def list_users(_: db.User = Depends(authuser)) -> list[UserResponse]:
    users = await db.users.list()
    return [
        UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            avatar=user.avatar,
            oauth_github_id=user.oauth_github_id,
        )
        for user in users
    ]
