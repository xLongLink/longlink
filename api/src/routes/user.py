from fastapi import Depends, HTTPException
from src.auth import authuser, authsupport
from src.database.models.users import User
from src.database.services.users import users
from src.router import router
from src.models.users import UserUpdate, UserProfile, UserListItem


async def serialize_user(user: User) -> UserProfile:
    """Return the authenticated user payload with memberships included."""

    profile = await users.profile(user.id)
    if profile is None:
        profile = UserProfile(**{**user.model_dump(), "admin": user.admin, "orgs": []})

    return profile


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: User = Depends(authuser)) -> UserProfile:
    """Return the authenticated user's details."""

    return await serialize_user(user)


@router.get("/api/users", response_model=list[UserListItem])
async def list_users(_user: User = Depends(authsupport)) -> list[UserListItem]:
    """Return all user summaries for support and administrator views."""

    return await users.list()


@router.patch("/api/me", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser)) -> UserProfile:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    if user.oidc_subject is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    updated_user = await users.upsert(oidc_subject=user.oidc_subject, **params)
    return await serialize_user(updated_user)
