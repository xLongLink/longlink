from fastapi import Depends, APIRouter
from src.auth import authuser, authsupport
from src.models.users import UserUpdate, UserProfile, UserListItem
from src.database.models.users import User
from src.database.services.users import users

router = APIRouter()


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: User = Depends(authuser)) -> UserProfile:
    """Return the authenticated user's details."""

    return await users.profile(user.id)


@router.get("/api/users", response_model=list[UserListItem])
async def list_users(_: User = Depends(authsupport)) -> list[UserListItem]:
    """Return all user summaries for support and administrator views."""

    return await users.list()


@router.patch("/api/me", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser)) -> UserProfile:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    updated_user = await users.upsert(oidc=user.oidc, **params)
    return await users.profile(updated_user.id)
