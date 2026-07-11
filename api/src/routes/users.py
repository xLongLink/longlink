from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authsupport
from src.models.users import UserUpdate, UserProfile, UserListItem, UserOrganizationMembership
from src.database.services import users
from src.database.models.users import User
from src.runtime import bootstrap

router = APIRouter()


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: User = Depends(authuser)):
    """Return the authenticated user's details."""

    return user


@router.get("/api/me/organizations", response_model=list[UserOrganizationMembership])
async def get_my_organizations(user: User = Depends(authuser)):
    """Return the authenticated user's organization memberships."""

    memberships = await users.organization_memberships(user.id)

    # Flatten organization rows with membership roles for the API response.
    return [
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "avatar": organization.avatar,
            "country": organization.country,
            "location": organization.location,
            "role": membership.role,
        }
        for organization, membership in memberships
    ]


@router.get("/api/users", response_model=list[UserListItem])
async def list_users(_: User = Depends(authsupport)):
    """Return all user summaries for support and administrator views."""

    return await users.fetch()


@router.patch("/api/me", response_model=UserProfile)
async def patch_me(payload: UserUpdate, user: User = Depends(authuser)):
    """Update the authenticated user's details."""

    params = payload.model_dump(exclude_unset=True)
    updated_user = await users.upsert(oidc=user.oidc, **params)

    # Keep organization mirrors in sync after profile changes.
    try:
        await bootstrap.sync_user_organizations(updated_user)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to synchronize user profile") from exc

    return updated_user
