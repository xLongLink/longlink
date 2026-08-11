from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin, get_session
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
async def get_my_organizations(user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """Return the authenticated user's organization memberships."""

    # Return active membership response data through the user persistence service.
    return await users.memberships(session, user.id)


@router.get("/users", response_model=list[UserSummary])
async def list_users(_: User = Depends(authadmin), session: AsyncSession = Depends(get_session)):
    """Return all user summaries for administrator views."""

    return await users.fetch(session)


@router.patch("/me", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """Update the authenticated user's details."""

    # Apply only supplied values that change the persisted profile.
    if not users.update_profile(user, payload):
        return user
    await session.commit()

    # Keep every organization database synchronized after profile update requests.
    for membership in await users.memberships(session, user.id):
        await organizations.sync_users(session, membership.organization_id)
    return user
