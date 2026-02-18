import src.db as db
from fastapi import Depends
from src.auth import authuser
from src.models import UserUpdate
from src.router import router


@router.get('/user')
async def get_user_details(user: db.User = Depends(authuser)):
    return user


@router.patch('/user')
async def patch_user_details(payload: UserUpdate, user: db.User = Depends(authuser)):
    params = payload.model_dump(exclude_unset=True)
    if not params:
        return user

    updated_user = await db.users.update(user.id, **params)
    return updated_user
