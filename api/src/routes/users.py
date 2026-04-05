import src.db as db
from fastapi import Depends
from src.auth import authuser
from src.router import router
from src.models.users import UserResponse


@router.get('/users')
async def list_users(_: db.User = Depends(authuser)) -> list[UserResponse]:
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
