from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin, get_auth_session
from src.models.users import UserUpdate, UserProfile, UserSummary, UserOrganizationMembership
from src.database.services import users, organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_me(user: User = Depends(authuser)):
    """Return the authenticated user's details."""

    return user


@router.get("/me/organizations", response_model=list[UserOrganizationMembership])
async def get_my_organizations(user: User = Depends(authuser)):
    """Return the authenticated user's organization memberships."""

    # Exclude memberships whose related Organization has been soft-deleted.
    return [membership for membership in user.organization_memberships if membership.organization.deleted_at is None]


@router.get("/users", response_model=list[UserSummary])
async def list_users(_: User = Depends(authadmin)):
    """Return all user summaries for administrator views."""

    return await users.fetch()


@router.patch("/me", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser), session: AsyncSession = Depends(get_auth_session)):
    """Update the authenticated user's details."""

    # Apply only supplied values that change the persisted profile.
    updated = False
    identity_updated = False
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        if getattr(user, field) == value:
            continue
        setattr(user, field, value)
        updated = True
        identity_updated = identity_updated or field in {"name", "avatar"}

    if updated:
        await session.commit()

    # Project shared identity fields without synchronizing Platform-only preferences.
    if identity_updated:
        for membership in user.organization_memberships:
            if membership.organization.deleted_at is None:
                await organizations.sync_users(membership.organization_id)
    return user
