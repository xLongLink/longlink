from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from sqlalchemy import select
from sqlalchemy.orm import contains_eager
from collections.abc import Sequence
from src.database.types import attr
from src.models.pricing import FREE_USERS
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def pending(session: AsyncSession, user: User) -> Sequence[OrganizationInvitation]:
    """Return unexpired invitations addressed to the user's email."""

    # Load response-ready Organizations and hide grants for deleted Organizations.
    statement = (
        select(OrganizationInvitation)
        .join(Organization, col(Organization.id) == col(OrganizationInvitation.organization_id))
        .options(
            contains_eager(attr(OrganizationInvitation.organization)).load_only(
                attr(Organization.id), attr(Organization.name), attr(Organization.slug), attr(Organization.status)
            )
        )
        .where(
            col(OrganizationInvitation.email) == user.email,
            # Expired invitations and deleted Organizations cannot grant access.
            col(OrganizationInvitation.created_at) > datetime.now(UTC) - timedelta(days=7),
            col(Organization.deleted_at).is_(None),
        )
        .order_by(col(OrganizationInvitation.created_at).desc())
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
    if invitation is None or organization.deleted_at is not None or invitation.created_at <= datetime.now(UTC) - timedelta(days=7):
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


async def decline(session: AsyncSession, user: User, invitation_id: UUID) -> None:
    """Delete one invitation addressed to the user's email."""

    # Hide grants addressed to other accounts behind the same response as missing grants.
    invitation = await session.get(OrganizationInvitation, invitation_id, with_for_update=True)
    if invitation is None or invitation.email != user.email:
        raise HTTPException(status_code=404, detail="Invitation not found")

    await session.delete(invitation)
