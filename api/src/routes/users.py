from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authsupport
from src.operations.implementation import bootstrap
from src.models.users import UserUpdate, UserProfile, UserListItem
from src.database.models.users import User
from src.database.services import users

router = APIRouter()


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: User = Depends(authuser)) -> dict[str, object]:
    """Return the authenticated user's details."""

    profile = await users.profile(user.id)

    # Require the authenticated user profile to exist.
    if profile is None:
        raise HTTPException(status_code=404, detail=f"User '{user.id}' not found")

    return profile


@router.get("/api/users", response_model=list[UserListItem])
async def list_users(_: User = Depends(authsupport)) -> list[User]:
    """Return all user summaries for support and administrator views."""

    records = await users.fetch_all()
    return records


@router.patch("/api/me", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser)) -> dict[str, object]:
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    updated_user = await users.upsert(oidc=user.oidc, **params)

    # Keep organization mirrors in sync after profile changes.
    try:
        await bootstrap.sync_user_organizations(updated_user)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to synchronize user profile") from exc

    profile = await users.profile(updated_user.id)

    # Require the refreshed user profile to exist.
    if profile is None:
        raise HTTPException(status_code=404, detail=f"User '{updated_user.id}' not found")

    return profile
