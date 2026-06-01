import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin
from src.models import UserUpdate, UserProfile, UserListItem

router = APIRouter(prefix="/api/me")
users_router = APIRouter(prefix="/api/users")


async def serialize_user(user: db.User) -> UserProfile:
    """Return the authenticated user payload with memberships included."""

    profile = await db.users.profile(user.id)
    if profile is None:
        profile = UserProfile(**{**user.model_dump(), "orgs": []})

    return profile


@router.get("", response_model=UserProfile)
async def get_me(user: db.User = Depends(authuser)) -> UserProfile:
    """Return the authenticated user's details."""

    return await serialize_user(user)


@users_router.get("", response_model=list[UserListItem])
async def list_users(_user: db.User = Depends(authadmin)) -> list[UserListItem]:
    """Return all user summaries for admin views."""

    return await db.users.list()


@router.patch("", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)) -> UserProfile:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    updated_user = user if not params else await db.users.update(user.id, **params)
    return await serialize_user(updated_user or user)
