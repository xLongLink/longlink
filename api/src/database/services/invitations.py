from uuid import UUID
from datetime import timedelta
from sqlalchemy import delete, select
from src.errors import ConflictError
from sqlalchemy.exc import IntegrityError
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from longlink.shared.models import Email
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def create(session: AsyncSession, organization_id: UUID, email: Email, role: OrganizationRoles) -> None:
    """Create or replace one active email grant for an organization."""

    # Reject emails that already belong to the organization.
    if (
        await session.scalar(
            select(User.id)
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.deleted_at.is_(None),
                User.email == email,
            )
        )
        is not None
    ):
        raise ConflictError("User is already a member")

    # Re-inviting replaces the existing active grant and refreshes its delivery timestamp.
    invitation_statement = (
        select(OrganizationInvitation)
        .where(
            OrganizationInvitation.organization_id == organization_id,
            OrganizationInvitation.email == email,
        )
        .with_for_update()
    )
    invitation = await session.scalar(invitation_statement)

    # Resolve concurrent re-invites to the one database-enforced active grant.
    if invitation is None:
        try:
            async with session.begin_nested():
                invitation = OrganizationInvitation(organization_id=organization_id, email=email, role=role)
                session.add(invitation)
                await session.flush()
        except IntegrityError as exc:
            invitation = await session.scalar(invitation_statement)
            if invitation is None:
                raise ConflictError("Invitation could not be created") from exc
        else:
            return

    invitation.role = role
    invitation.created_at = utcnow()


async def accept(session: AsyncSession, user: User) -> set[UUID]:
    """Accept active email grants and return the Organizations with changed memberships."""

    # Lock the recipient's pending grants before separating active and expired invitations.
    result = await session.scalars(
        select(OrganizationInvitation)
        .join(Organization, Organization.id == OrganizationInvitation.organization_id)
        .where(
            Organization.deleted_at.is_(None),
            OrganizationInvitation.email == user.email,
        )
        .with_for_update()
    )
    pending_invitations = result.all()
    if not pending_invitations:
        return set()

    # Keep grants active for seven days and consume expired grants without creating access.
    cutoff = utcnow() - timedelta(days=7)
    active_invitations = [invitation for invitation in pending_invitations if invitation.created_at > cutoff]
    delete_pending_invitations = delete(OrganizationInvitation).where(
        OrganizationInvitation.id.in_([invitation.id for invitation in pending_invitations])
    )
    if not active_invitations:
        await session.execute(delete_pending_invitations)
        return set()

    # Lock every existing membership before creating or restoring invitation access.
    result = await session.scalars(
        select(UserOrganization)
        .where(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id.in_([invitation.organization_id for invitation in active_invitations]),
        )
        .with_for_update()
    )
    memberships = result.all()
    memberships_by_organization_id = {membership.organization_id: membership for membership in memberships}

    changed_organization_ids: set[UUID] = set()

    # Create or restore access without changing active membership roles.
    for invitation in active_invitations:
        membership = memberships_by_organization_id.get(invitation.organization_id)
        if membership is None:
            session.add(
                UserOrganization(
                    user_id=user.id,
                    organization_id=invitation.organization_id,
                    role=invitation.role,
                    created_id=user.id,
                    updated_id=user.id,
                )
            )
            changed_organization_ids.add(invitation.organization_id)
        elif membership.deleted_at is not None:
            membership.role = invitation.role
            membership.updated_at = utcnow()
            membership.updated_id = user.id
            membership.deleted_at = None
            membership.deleted_id = None
            changed_organization_ids.add(invitation.organization_id)

    # Consumed and expired grants no longer need an active or audit record.
    await session.execute(delete_pending_invitations)

    return changed_organization_ids
