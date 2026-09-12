from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin, get_session
from src.models.users import UserUpdate, UserSummary, UserOrganizationMembership
from src.database.services import users, organizations
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

    # Avoid persistence and synchronization for unchanged profile values.
    if (payload.name is None or payload.name == user.name) and (payload.avatar is None or payload.avatar == user.avatar):
        return user

    # Lock Organizations in stable order before changing the user, matching membership mutation lock order.
    for organization_id in sorted(await users.organization_ids(session, user.id)):
        await organizations.sync_users(session, organization_id)

    # Commit profile changes and durable projection demand together.
    if payload.name is not None:
        user.name = payload.name
    if payload.avatar is not None:
        user.avatar = payload.avatar
    await session.commit()
    return user
