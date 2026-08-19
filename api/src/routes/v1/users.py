from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin, get_session
from sqlalchemy import select
from src.models.users import UserUpdate, UserSummary, UserOrganizationMembership
from src.database.services import users, organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()


@router.get("/me", response_model=UserSummary)
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

    result = await session.scalars(select(User))
    return result.all()


@router.patch("/me", response_model=UserSummary)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """Update the authenticated user's details."""

    # Apply only supplied values that change the persisted profile.
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        if getattr(user, field) == value:
            continue
        setattr(user, field, value)
    if not session.is_modified(user):
        return user
    await session.commit()

    # Keep every organization database synchronized after profile update requests.
    for membership in await users.memberships(session, user.id):
        await organizations.sync_users(session, membership.organization_id)
    return user
