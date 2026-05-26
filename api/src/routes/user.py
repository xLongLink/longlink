import src.db as db
from sqlalchemy import select
from fastapi import Depends, APIRouter
from src.auth import authuser
from src.db.session import get_session
from src.models import UserUpdate
from src.db.models.association import user_apps, user_organizations

router = APIRouter(prefix="/api/me")


async def serialize_user(user: db.User) -> dict:
    """Return the authenticated user payload with memberships included."""

    payload = user.model_dump()

    Session = await get_session()
    async with Session() as session:
        # Load organization memberships directly from the association table.
        statement = select(
            user_organizations.c.organization_name,
            user_organizations.c.role_name,
        ).where(user_organizations.c.user_id == user.id)
        result = await session.execute(statement)
        payload["orgs"] = [
            {"name": organization_name, "role": role_name}
            for organization_name, role_name in result.all()
        ]

        # Load app memberships separately so app roles stay independent from org roles.
        statement = select(
            user_apps.c.organization_name,
            user_apps.c.app_name,
            user_apps.c.role_name,
        ).where(user_apps.c.user_id == user.id)
        result = await session.execute(statement)
        payload["apps"] = [
            {"organization": organization_name, "name": app_name, "role": role_name}
            for organization_name, app_name, role_name in result.all()
        ]

    return payload


@router.get("")
async def get_me(user: db.User = Depends(authuser)) -> dict:
    """Return the authenticated user's details."""

    return await serialize_user(user)


@router.patch("")
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)):
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    if not params:
        return await serialize_user(user)

    updated_user = await db.users.update(user.id, **params)
    return await serialize_user(updated_user) if updated_user is not None else await serialize_user(user)
