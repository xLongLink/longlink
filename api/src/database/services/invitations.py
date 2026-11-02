from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from src.utils import roles
from sqlalchemy import Select, select
from sqlalchemy.orm import contains_eager
from collections.abc import Sequence
from src.models.roles import OrganizationRoles
from src.database.types import attr
from src.models.pricing import FREE_USERS
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import OrganizationInvitationCreate
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization

INVITATION_LIFETIME = timedelta(days=7)


def _active_query() -> Select[OrganizationInvitation]:
    """Select unexpired grants for active Organizations, newest first."""

    return (
        select(OrganizationInvitation)
        .join(Organization, col(Organization.id) == col(OrganizationInvitation.organization_id))
        .where(col(OrganizationInvitation.created_at) > datetime.now(UTC) - INVITATION_LIFETIME, col(Organization.deleted_at).is_(None))
        .order_by(col(OrganizationInvitation.created_at).desc())
    )


async def fetch(session: AsyncSession, organization_id: UUID) -> Sequence[OrganizationInvitation]:
    """Return active email grants for one Organization."""

    # Scope the shared active grant query to the requested Organization.
    statement = _active_query().where(col(OrganizationInvitation.organization_id) == organization_id)
    result = await session.scalars(statement)
    return result.all()


async def pending(session: AsyncSession, user: User) -> Sequence[OrganizationInvitation]:
    """Return unexpired invitations addressed to the user's email."""

    # Load response-ready Organizations and hide grants for deleted Organizations.
    statement = (
        _active_query()
        .options(
            contains_eager(attr(OrganizationInvitation.organization)).load_only(
                attr(Organization.id), attr(Organization.name), attr(Organization.slug), attr(Organization.status)
            )
        )
        .where(col(OrganizationInvitation.email) == user.email)
    )
    result = await session.scalars(statement)
    return result.all()


async def accept(session: AsyncSession, user: User, invitation_id: UUID) -> None:
    """Admit the user to an Organization through one unexpired invitation."""

    # Resolve the recipient's grant without taking its lock before the Organization admission lock.
    pending_invitation = await session.get(OrganizationInvitation, invitation_id)
    if pending_invitation is None or pending_invitation.email != user.email:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Lock the Organization, then refresh the grant so concurrent revocations cannot be accepted.
    organization = await organizations.lock(session, pending_invitation.organization_id)
    invitation = await session.get(OrganizationInvitation, invitation_id, populate_existing=True, with_for_update=True)
    if invitation is None or organization.deleted_at is not None or invitation.created_at <= datetime.now(UTC) - INVITATION_LIFETIME:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Keep an existing role, and admit new members only within the Free member allowance.
    membership = await session.get(UserOrganization, (user.id, organization.id))
    if membership is None:
        if organization.stripe_payment_method_id is None and await organizations.member_count(session, organization.id) >= FREE_USERS:
            raise HTTPException(status_code=409, detail="This organization has reached its member limit. Ask an owner to register a card.")
        membership = UserOrganization(user_id=user.id, organization_id=organization.id, role=invitation.role)
        session.add(membership)

    # Consume the grant together with the admission.
    await session.delete(invitation)


async def create(session: AsyncSession, organization_id: UUID, payload: OrganizationInvitationCreate, user_id: UUID) -> None:
    """Authorize and create one Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    organization, membership = await organizations.lock_active_access(session, user_id, organization_id, OrganizationRoles.maintain)
    if not roles.atleast(membership.role, payload.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    # Pending invitations do not count against the organization's member allowance.
    if organization.stripe_payment_method_id is None and await organizations.member_count(session, organization_id) >= FREE_USERS:
        raise HTTPException(status_code=409, detail=f"Register a card before adding more than {FREE_USERS} members.")

    # Reject emails that already belong to the locked Organization.
    if (
        await session.scalar(
            select(col(User.id))
            .join(UserOrganization, col(UserOrganization.user_id) == col(User.id))
            .where(col(UserOrganization.organization_id) == organization_id, col(User.email) == payload.email)
        )
        is not None
    ):
        raise HTTPException(status_code=409, detail="User is already a member")

    # Re-inviting replaces the existing active grant and refreshes its delivery timestamp.
    invitation_statement = (
        select(OrganizationInvitation)
        .where(col(OrganizationInvitation.organization_id) == organization_id, col(OrganizationInvitation.email) == payload.email)
        .with_for_update()
    )
    invitation = await session.scalar(invitation_statement)

    # Create the grant while the Organization lock serializes invitation commands.
    if invitation is None:
        invitation = OrganizationInvitation(organization_id=organization_id, email=payload.email, role=payload.role)
        session.add(invitation)
        await session.flush()
        return

    invitation.role = payload.role
    invitation.created_at = datetime.now(UTC)


async def revoke(session: AsyncSession, organization_id: UUID, invitation_id: UUID, user_id: UUID) -> None:
    """Authorize and revoke one active Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    _, membership = await organizations.lock_active_access(session, user_id, organization_id, OrganizationRoles.maintain)

    # Resolve only an invitation belonging to the locked Organization.
    invitation = await session.get(OrganizationInvitation, invitation_id, with_for_update=True)
    if invitation is None or invitation.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if not roles.atleast(membership.role, invitation.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    await session.delete(invitation)


async def decline(session: AsyncSession, user: User, invitation_id: UUID) -> None:
    """Delete one invitation addressed to the user's email."""

    # Hide grants addressed to other accounts behind the same response as missing grants.
    invitation = await session.get(OrganizationInvitation, invitation_id, with_for_update=True)
    if invitation is None or invitation.email != user.email:
        raise HTTPException(status_code=404, detail="Invitation not found")

    await session.delete(invitation)
