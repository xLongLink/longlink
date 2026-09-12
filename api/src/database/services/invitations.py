from uuid import UUID
from datetime import timedelta
from sqlmodel import col
from sqlalchemy import delete, select, update
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
            select(col(User.id))
            .join(UserOrganization, col(UserOrganization.user_id) == col(User.id))
            .where(
                col(UserOrganization.organization_id) == organization_id,
                col(User.email) == email,
            )
        )
        is not None
    ):
        raise ConflictError("User is already a member")

    # Re-inviting replaces the existing active grant and refreshes its delivery timestamp.
    invitation_statement = (
        select(OrganizationInvitation)
        .where(
            col(OrganizationInvitation.organization_id) == organization_id,
            col(OrganizationInvitation.email) == email,
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
            return
        except IntegrityError as exc:
            invitation = await session.scalar(invitation_statement)
            if invitation is None:
                raise ConflictError("Invitation could not be created") from exc

    invitation.role = role
    invitation.created_at = utcnow()


async def accept(session: AsyncSession, user: User) -> set[UUID]:
    """Accept email grants and request projection for changed memberships in the caller's transaction."""

    # Lock the recipient's pending grants before separating active and expired invitations.
    result = await session.scalars(
        select(OrganizationInvitation)
        .join(Organization, col(Organization.id) == col(OrganizationInvitation.organization_id))
        .where(
            col(Organization.deleted_at).is_(None),
            col(OrganizationInvitation.email) == user.email,
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
        col(OrganizationInvitation.id).in_(invitation.id for invitation in pending_invitations)
    )
    if not active_invitations:
        await session.execute(delete_pending_invitations)
        return set()

    # Lock every existing membership before creating invitation access.
    result = await session.scalars(
        select(UserOrganization)
        .where(
            col(UserOrganization.user_id) == user.id,
            col(UserOrganization.organization_id).in_(invitation.organization_id for invitation in active_invitations),
        )
        .with_for_update()
    )
    memberships_by_organization_id = {membership.organization_id: membership for membership in result}

    changed_organization_ids: set[UUID] = set()

    # Create access without changing existing membership roles.
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

    # Consumed and expired grants no longer need an active or audit record.
    await session.execute(delete_pending_invitations)

    # Durably request projection only for changed memberships, in a stable lock order.
    for organization_id in sorted(changed_organization_ids):
        await session.execute(update(Organization).where(col(Organization.id) == organization_id).values(database_sync_pending=True))

    return changed_organization_ids
