import src.db as db
from fastapi import APIRouter, Depends
from src.auth import authadmin, authuser
from src.models import (
    APIResponse,
    UserListItem,
    UserProfile,
    UserUpdate,
)

router = APIRouter(prefix="/api/me")
users_router = APIRouter(prefix="/api/users")


async def serialize_user(user: db.User) -> APIResponse[UserProfile]:
    """Return the authenticated user payload with memberships included."""

    profile = await db.users.profile(user.id)
    if profile is None:
        profile = UserProfile.model_validate({**user.model_dump(), "orgs": []})

    return APIResponse(
        success=True,
        detail="User profile fetched",
        data=profile,
    )


@router.get("")
async def get_me(user: db.User = Depends(authuser)) -> APIResponse[UserProfile]:
    """Return the authenticated user's details."""

    return await serialize_user(user)


@users_router.get("")
async def list_users(_user: db.User = Depends(authadmin)) -> APIResponse[list[UserListItem]]:
    """Return all user summaries for admin views."""

    users = await db.users.list()
    payload = [UserListItem.model_validate(user.model_dump()) for user in users]

    return APIResponse(success=True, detail="Users fetched", data=payload)


@router.patch("")
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)) -> APIResponse[UserProfile]:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    updated_user = user if not params else await db.users.update(user.id, **params)
    profile = await db.users.profile(updated_user.id if updated_user is not None else user.id)
    if profile is None:
        profile = UserProfile.model_validate({**(updated_user or user).model_dump(), "orgs": []})

    return APIResponse(success=True, detail="User profile updated", data=profile)
