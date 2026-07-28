from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin, get_auth_session, current_authenticated_user
from src.models.users import UserUpdate, UserProfile, UserSummary, UserOrganizationMembership
from src.database.services import users
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: User = Depends(current_authenticated_user)):
    """Return the authenticated user's details."""

    return user


@router.get("/api/me/organizations", response_model=list[UserOrganizationMembership])
async def get_my_organizations(user: User = Depends(authuser)):
    """Return the authenticated user's organization memberships."""

    # Exclude memberships whose related Organization has been soft-deleted.
    return [membership for membership in user.organization_memberships if membership.organization.deleted_at is None]


@router.get("/api/users", response_model=list[UserSummary])
async def list_users(_: User = Depends(authadmin)):
    """Return all user summaries for administrator views."""

    return await users.fetch()


@router.patch("/api/me", response_model=UserProfile)
async def patch_me(
    payload: UserUpdate, user: User = Depends(current_authenticated_user), session: AsyncSession = Depends(get_auth_session)
):
    """Update the authenticated user's details."""

    # Apply only non-null profile fields supplied by the caller.
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in updates.items():
        setattr(user, field, value)

    if updates:
        await session.commit()
    return user
