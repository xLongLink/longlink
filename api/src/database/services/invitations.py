from __future__ import annotations

from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def list_by_organization(organization_id: UUID) -> list[OrganizationInvitation]:
    """Return all active invitations for one organization."""

    async with session_scope() as session:
        statement = (
            select(OrganizationInvitation)
            .where(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.deleted_at.is_(None),
            )
            .order_by(OrganizationInvitation.created_at.desc())
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def create(organization_id: UUID, email: str, role_name: OrganizationRoles, user: User) -> OrganizationInvitation:
    """Create one invitation after checking for duplicates and memberships."""

    normalized_email = email.strip().lower()

    async with session_scope() as session:
        organization_statement = select(Organization.id).where(
            Organization.id == organization_id,
            Organization.deleted_at.is_(None),
        )
        if (await session.execute(organization_statement)).scalar_one_or_none() is None:
            raise ValueError("Organization not found")

        # Reject invitations for emails that already belong to the organization.
        member_statement = (
            select(User.id)
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.deleted_at.is_(None),
                func.lower(User.email) == normalized_email,
            )
        )
        if (await session.execute(member_statement)).scalar_one_or_none() is not None:
            raise ValueError("User is already a member")

        # Keep one pending invitation per email address in an organization.
        invitation_statement = select(OrganizationInvitation.id).where(
            OrganizationInvitation.organization_id == organization_id,
            OrganizationInvitation.deleted_at.is_(None),
            func.lower(OrganizationInvitation.email) == normalized_email,
        )
        if (await session.execute(invitation_statement)).scalar_one_or_none() is not None:
            raise ValueError("Invitation already exists")

        invitation = OrganizationInvitation(
            organization_id=organization_id,
            email=normalized_email,
            role_name=role_name,
        )
        invitation.created_id = user.id
        invitation.updated_id = user.id
        session.add(invitation)

        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise ValueError("Invitation already exists") from exc

        await session.refresh(invitation)
        return invitation
