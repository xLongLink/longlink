from datetime import UTC, datetime, timedelta
from sqlmodel import col
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def accept(session: AsyncSession, user: User) -> None:
    """Accept email grants for changed memberships in the caller's transaction."""

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
        return

    # Keep grants active for seven days and consume expired grants without creating access.
    cutoff = datetime.now(UTC) - timedelta(days=7)
    active_invitations = [invitation for invitation in pending_invitations if invitation.created_at > cutoff]
    delete_pending_invitations = delete(OrganizationInvitation).where(
        col(OrganizationInvitation.id).in_(invitation.id for invitation in pending_invitations)
    )
    if not active_invitations:
        await session.execute(delete_pending_invitations)
        return

    # Lock every existing membership before creating invitation access.
    result = await session.scalars(
        select(UserOrganization)
        .where(
            col(UserOrganization.user_id) == user.id,
            col(UserOrganization.organization_id).in_(invitation.organization_id for invitation in active_invitations),
        )
        .with_for_update()
    )
    organization_ids = {membership.organization_id for membership in result}

    # Create access without changing existing membership roles.
    for invitation in active_invitations:
        if invitation.organization_id not in organization_ids:
            session.add(
                UserOrganization(
                    user_id=user.id,
                    organization_id=invitation.organization_id,
                    role=invitation.role,
                )
            )

    # Consumed and expired grants no longer need an active or audit record.
    await session.execute(delete_pending_invitations)
