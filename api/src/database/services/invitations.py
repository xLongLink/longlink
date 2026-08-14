from uuid import UUID
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def create(session: AsyncSession, organization_id: UUID, email: str, role: OrganizationRoles) -> OrganizationInvitation:
    """Create or replace one active email grant for an organization."""

    normalized_email = email.strip().lower()

    # Require an active target organization.
    if await session.scalar(
        select(Organization.id).where(
            Organization.id == organization_id,
            Organization.deleted_at.is_(None),
        )
    ) is None:
        raise NotFoundError("Organization not found")

    # Reject emails that already belong to the organization.
    result = await session.scalars(
        select(User.id)
        .join(UserOrganization, UserOrganization.user_id == User.id)
        .where(
            UserOrganization.organization_id == organization_id,
            UserOrganization.deleted_at.is_(None),
            func.lower(User.email) == normalized_email,
        )
    )
    if result.one_or_none() is not None:
        raise ConflictError("User is already a member")

    # Re-inviting replaces the existing active grant and refreshes its delivery timestamp.
    invitation = await session.scalar(
        select(OrganizationInvitation)
        .where(
            OrganizationInvitation.organization_id == organization_id,
            OrganizationInvitation.email == normalized_email,
        )
        .with_for_update()
    )
    if invitation is not None:
        invitation.role = role
        invitation.created_at = utcnow()
        return invitation

    # Resolve concurrent re-invites to the one database-enforced active grant.
    try:
        async with session.begin_nested():
            invitation = OrganizationInvitation(organization_id=organization_id, email=normalized_email, role=role)
            session.add(invitation)
            await session.flush()
    except IntegrityError as exc:
        invitation = await session.scalar(
            select(OrganizationInvitation)
            .where(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.email == normalized_email,
            )
            .with_for_update()
        )
        if invitation is None:
            raise ConflictError("Invitation could not be created") from exc
        invitation.role = role
        invitation.created_at = utcnow()

    return invitation


async def accept(session: AsyncSession, user: User) -> set[UUID]:
    """Accept active email grants and return the Organizations with changed memberships."""

    normalized_email = user.email.strip().lower()

    # Lock the recipient's active grants before creating or restoring memberships.
    result = await session.scalars(
        select(OrganizationInvitation)
        .join(Organization, Organization.id == OrganizationInvitation.organization_id)
        .where(
            Organization.deleted_at.is_(None),
            OrganizationInvitation.email == normalized_email,
        )
        .with_for_update()
    )
    invitations = result.all()
    if not invitations:
        return set()

    # Lock every existing membership before creating or restoring invitation access.
    result = await session.scalars(
        select(UserOrganization)
        .where(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id.in_([invitation.organization_id for invitation in invitations]),
        )
        .with_for_update()
    )
    memberships = result.all()
    memberships_by_organization_id = {membership.organization_id: membership for membership in memberships}

    changed_organization_ids: set[UUID] = set()

    # Create or restore access without changing active membership roles.
    for invitation in invitations:
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

        # Consumed grants no longer need an active or audit record.
        await session.delete(invitation)

    return changed_organization_ids
