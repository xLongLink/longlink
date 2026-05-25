import src.db as db
from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models import UserUpdate

router = APIRouter(prefix="/api/me")


def serialize_user(user: db.User) -> dict:
    """Return the authenticated user payload with memberships included."""

    payload = user.model_dump()
    payload["orgs"] = [org.model_dump() for org in user.orgs]
    return payload


@router.get("")
async def get_me(user: db.User = Depends(authuser)) -> dict:
    """Return the authenticated user's details."""

    return serialize_user(user)


@router.patch("")
async def patch_me(payload: UserUpdate, user: db.User = Depends(authuser)):
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    if not params:
        return serialize_user(user)

    updated_user = await db.users.update(user.id, **params)
    return serialize_user(updated_user) if updated_user is not None else serialize_user(user)
