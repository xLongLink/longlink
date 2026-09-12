from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin, get_session
from src.models.users import UserUpdate, UserSummary, UserOrganizationMembership
from src.database.services import users
from src.models.pagination import Page, Pagination
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


@router.get("/users", response_model=Page[UserSummary])
async def list_users(
    _: User = Depends(authadmin),
    pagination: Pagination = Depends(),
    session: AsyncSession = Depends(get_session),
):
    """Return all user summaries for administrator views."""

    items, total = await users.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.patch("/me", response_model=UserSummary)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """Update the authenticated user's details."""

    # Commit profile changes and durable projection demand together, without a no-op transaction.
    if not await users.update_profile(session, user, payload):
        return user
    await session.commit()
    return user
