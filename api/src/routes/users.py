from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authsupport
from src.models.users import UserUpdate, UserProfile, UserListItem
from src.database.services import users
from src.database.models.users import User
from src.operations.implementation import bootstrap
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization

router = APIRouter()


def user_profile_payload(profile: tuple[User, list[tuple[Organization, UserOrganization]]]) -> dict[str, object]:
    """Return the API profile payload for one user and organization memberships."""

    user, memberships = profile

    # Keep response shaping in the route layer while services return database rows.
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "role": user.role,
        "theme": user.theme,
        "accent": user.accent,
        "radius": user.radius,
        "language": user.language,
        "oidc": user.oidc,
        "organizations": [
            {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "avatar": organization.avatar,
                "country": organization.country,
                "location": organization.location,
                "role": membership.role_name,
            }
            for organization, membership in memberships
        ],
    }


@router.get("/api/me", response_model=UserProfile)
async def get_me(user: User = Depends(authuser)):
    """Return the authenticated user's details."""

    profile = await users.profile(user.id)

    # Require the authenticated user profile to exist.
    if profile is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user_profile_payload(profile)


@router.get("/api/users", response_model=list[UserListItem])
async def list_users(_: User = Depends(authsupport)):
    """Return all user summaries for support and administrator views."""

    records = await users.fetch()
    return records


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

    profile = await users.profile(updated_user.id)

    # Require the refreshed user profile to exist.
    if profile is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user_profile_payload(profile)
