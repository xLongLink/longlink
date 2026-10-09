from src import auth
from fastapi import Depends, APIRouter
from src.models.users import UserUpdate, UserSummary, AdminUserSummary, UserOrganizationMembership
from src.database.services import users, organizations
from src.models.pagination import Page, Pagination

router = APIRouter()


@router.get("/me", response_model=UserSummary)
async def get_me(user: auth.CurrentUser):
    """Return the authenticated user's details."""

    return user


@router.get("/me/organizations", response_model=list[UserOrganizationMembership])
async def get_my_organizations(user: auth.CurrentUser, session: auth.Session):
    """Return the authenticated user's organization memberships."""

    # Return active membership response data through the Organization persistence service.
    return await organizations.memberships(session, user.id)


@router.get("/users", response_model=Page[AdminUserSummary])
async def list_users(
    _: auth.PlatformAdmin,
    session: auth.Session,
    pagination: Pagination = Depends(),
):
    """Return all user summaries for administrator views."""

    items, total = await users.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.patch("/me", response_model=UserSummary)
async def patch_me(payload: UserUpdate, user: auth.CurrentUser, session: auth.Session):
    """Update the authenticated user's details."""

    # Commit profile changes and durable projection demand together, without a no-op transaction.
    if (payload.name is None or payload.name == user.name) and (payload.avatar is None or payload.avatar == user.avatar):
        return user

    if payload.name is not None:
        user.name = payload.name
    if payload.avatar is not None:
        user.avatar = payload.avatar

    await session.commit()
    return user
