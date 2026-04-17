import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models import UserUpdate

router = APIRouter()


@router.get("/user")
async def get_user_details(user: db.User = Depends(authuser)):
    """Return the authenticated user's details."""
    return user


@router.patch("/user")
async def patch_user_details(payload: UserUpdate, user: db.User = Depends(authuser)):
    """Update the authenticated user's details."""
    params = payload.model_dump(exclude_unset=True)
    if not params:
        return user

    updated_user = await db.users.update(user.id, **params)
    return updated_user
