import src.db as db
from fastapi import Depends, HTTPException, status
from src.auth import authuser, authadmin
from src.models import UserUpdate, UserProfile, UserListItem
from src.router import router


async def serialize_user(user: db.User) -> UserProfile:
    """Return the authenticated user payload with memberships included."""

    profile = await db.users.profile(user.id)
    if profile is None:
        profile = UserProfile(**{**user.model_dump(), "orgs": []})

    return profile


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: db.User = Depends(authuser)) -> UserProfile:
    """Return the authenticated user's details."""

    return await serialize_user(user)


@router.get("/api/users", response_model=list[UserListItem])
async def list_users(_user: db.User = Depends(authadmin)) -> list[UserListItem]:
    """Return all user summaries for admin views."""

    return await db.users.list()


@router.patch("/api/me", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)) -> UserProfile:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    if user.oidc_subject is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    updated_user = await db.users.upsert(oidc_subject=user.oidc_subject, **params)
    return await serialize_user(updated_user)
