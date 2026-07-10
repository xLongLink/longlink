from fastapi import Depends, APIRouter
from src.auth import authuser, authsupport
from src.errors import NotFoundError, UnavailableError
from src.operations.implementation import bootstrap
from src.models.users import UserUpdate, UserProfile, UserListItem
from src.database.models.users import User
from src.database.services import users

router = APIRouter()


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: User = Depends(authuser)) -> dict[str, object]:
    """Return the authenticated user's details."""

    profile = await users.profile(user.id)
    if profile is None:
        raise NotFoundError("User", user.id)

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
    try:
        await bootstrap.sync_user_organizations(updated_user)
    except Exception as exc:
        raise UnavailableError("Failed to synchronize user profile") from exc

    profile = await users.profile(updated_user.id)
    if profile is None:
        raise NotFoundError("User", updated_user.id)

    return profile
