from src import auth
from uuid import UUID
from fastapi import Depends, APIRouter
from src.models.users import UserUpdate, CurrentUser, UserOrganizationInvitation, UserOrganizationMembership
from src.database.services import invitations, organizations

router = APIRouter(dependencies=[Depends(auth.authuser)])


@router.get("/me", response_model=CurrentUser)
async def get_me(user: auth.CurrentUser):
    """Return the authenticated user's details."""

    return user


@router.get("/me/organizations", response_model=list[UserOrganizationMembership])
async def get_my_organizations(session: auth.Session, user: auth.CurrentUser):
    """Return the authenticated user's organization memberships."""

    # Return active membership response data through the Organization persistence service.
    return await organizations.memberships(session, user.id)


@router.get("/me/invitations", response_model=list[UserOrganizationInvitation])
async def get_my_invitations(session: auth.Session, user: auth.CurrentUser):
    """Return the authenticated user's pending Organization invitations."""

    # Match unexpired invitations to the account's email address.
    return await invitations.pending(session, user)


@router.post("/me/invitations/{invitation_id}/accept", status_code=204)
async def accept_my_invitation(session: auth.Session, invitation_id: UUID, user: auth.CurrentUser):
    """Join an Organization by accepting one pending invitation."""

    # Commit the new membership together with the consumed invitation.
    await invitations.accept(session, user, invitation_id)
    await session.commit()


@router.delete("/me/invitations/{invitation_id}", status_code=204)
async def decline_my_invitation(session: auth.Session, invitation_id: UUID, user: auth.CurrentUser):
    """Decline one pending Organization invitation."""

    # Delete the invitation so it also disappears from the Organization's invitation list.
    await invitations.decline(session, user, invitation_id)
    await session.commit()


@router.patch("/me", response_model=CurrentUser)
async def patch_me(session: auth.Session, payload: UserUpdate, user: auth.CurrentUser):
    """Update the authenticated user's details."""

    # Persist the authoritative profile; Solutions refresh it on the user's next request.
    if payload.name is not None:
        user.name = payload.name
    if payload.avatar is not None:
        user.avatar = payload.avatar

    # Keep appearance changes personal and independent of Organization settings.
    if payload.theme is not None:
        user.theme = payload.theme
    if payload.accent is not None:
        user.accent = payload.accent
    if payload.navigation is not None:
        user.navigation = payload.navigation

    await session.commit()

    return user
