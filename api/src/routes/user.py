import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models import UserUpdate

router = APIRouter(prefix="/api/me")


@router.get("")
async def get_me(user: db.User = Depends(authuser)) -> dict:
    """Return the authenticated user's details."""

    return user.model_dump()


@router.patch("")
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)):
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    if not params:
        return user

    updated_user = await db.users.update(user.id, **params)
    return updated_user
