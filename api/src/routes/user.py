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
        profile = UserProfile.model_validate({**user.model_dump(), "orgs": []})

    return profile


@router.get("", response_model=UserProfile)
async def get_me(user: db.User = Depends(authuser)) -> UserProfile:
    """Return the authenticated user's details."""

    return await serialize_user(user)


@users_router.get("", response_model=list[UserListItem])
async def list_users(_user: db.User = Depends(authadmin)) -> list[UserListItem]:
    """Return all user summaries for admin views."""

    users = await db.users.list()
    payload = [UserListItem.model_validate(user.model_dump()) for user in users]

    return payload


@router.patch("", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)) -> UserProfile:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    updated_user = user if not params else await db.users.update(user.id, **params)
    profile = await db.users.profile(updated_user.id if updated_user is not None else user.id)
    if profile is None:
        profile = UserProfile.model_validate({**(updated_user or user).model_dump(), "orgs": []})

    return profile
