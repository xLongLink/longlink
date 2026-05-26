import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models import (
    APIResponse,
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
@users_router.get("")
async def get_me(user: db.User = Depends(authuser)) -> APIResponse[UserProfile]:
    """Return the authenticated user's details."""

    return await serialize_user(user)


@router.patch("")
@users_router.patch("")
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)) -> APIResponse[UserProfile]:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    updated_user = user if not params else await db.users.update(user.id, **params)
    profile = await db.users.profile(updated_user.id if updated_user is not None else user.id)
    if profile is None:
        profile = UserProfile.model_validate({**(updated_user or user).model_dump(), "orgs": []})

    return APIResponse(success=True, detail="User profile updated", data=profile)
