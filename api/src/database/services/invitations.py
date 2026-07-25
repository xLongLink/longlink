from uuid import UUID
from fastapi import HTTPException
from src.utils import roles
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import operations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def create(organization_id: UUID, email: str, role: OrganizationRoles, user: User) -> OrganizationInvitation:
    """Create one invitation after checking for duplicates and memberships."""

    normalized_email = email.strip().lower()

    # Use one session for validation and invitation creation.
    async with session_scope() as session:
        organization_statement = select(Organization.id).where(
            Organization.id == organization_id,
            Organization.deleted_at.is_(None),
        )

        # Require an active target organization.
        if (await session.execute(organization_statement)).scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Organization not found")

        member_statement = (
            select(User.id)
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.deleted_at.is_(None),
                func.lower(User.email) == normalized_email,
            )
        )

        # Reject emails that already belong to the organization.
        if (await session.execute(member_statement)).scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="User is already a member")

        invitation_statement = select(OrganizationInvitation.id).where(
            OrganizationInvitation.organization_id == organization_id,
            OrganizationInvitation.deleted_at.is_(None),
            func.lower(OrganizationInvitation.email) == normalized_email,
        )

        # Keep one pending invitation per email address.
        if (await session.execute(invitation_statement)).scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Invitation already exists")

        invitation = OrganizationInvitation(
            organization_id=organization_id,
            email=normalized_email,
            role=role,
        )
        invitation.created_id = user.id
        invitation.updated_id = user.id
        session.add(invitation)

        # Commit so uniqueness violations surface consistently.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Invitation already exists") from exc

        await session.refresh(invitation)
        return invitation


async def accept_in_session(session: AsyncSession, user: User) -> int:
    """Accept pending invitations for one user's verified email in the caller's transaction."""

    normalized_email = user.email.strip().lower()

    # Lock matching invitations and retain their exact Organization boundaries.
    statement = (
        select(OrganizationInvitation, Organization.compute_id)
        .join(Organization, Organization.id == OrganizationInvitation.organization_id)
        .where(
            OrganizationInvitation.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
            func.lower(OrganizationInvitation.email) == normalized_email,
        )
        .order_by(OrganizationInvitation.organization_id, OrganizationInvitation.created_at, OrganizationInvitation.id)
        .with_for_update()
    )
    rows = (await session.execute(statement)).all()
    if not rows:
        return 0

    # Group by Organization so duplicate pending rows can never create or elevate multiple memberships.
    organization_invitations: dict[UUID, list[OrganizationInvitation]] = {}
    organization_computes: dict[UUID, UUID] = {}
    for invitation, compute_id in rows:
        organization_invitations.setdefault(invitation.organization_id, []).append(invitation)
        organization_computes[invitation.organization_id] = compute_id

    now = utcnow()
    changed_compute_ids: set[UUID] = set()

    # Create or restore access within each invitation's Organization without changing active roles.
    for organization_id, pending in organization_invitations.items():
        invitation = min(pending, key=lambda item: roles.rank(item.role))
        membership = (
            await session.execute(
                select(UserOrganization)
                .where(
                    UserOrganization.user_id == user.id,
                    UserOrganization.organization_id == organization_id,
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
        if membership is None:
            session.add(
                UserOrganization(
                    user_id=user.id,
                    organization_id=organization_id,
                    role=invitation.role,
                    created_id=invitation.created_id,
                    updated_id=user.id,
                )
            )
            changed_compute_ids.add(organization_computes[organization_id])
        elif membership.deleted_at is not None:
            membership.role = invitation.role
            membership.updated_at = now
            membership.updated_id = user.id
            membership.deleted_at = None
            membership.deleted_id = None
            changed_compute_ids.add(organization_computes[organization_id])

        # Consume every matching invitation, including safe duplicate rows.
        for item in pending:
            item.updated_at = now
            item.updated_id = user.id
            item.deleted_at = now
            item.deleted_id = user.id

    # Publish new Organization access to managed runtimes after the transaction commits.
    for compute_id in sorted(changed_compute_ids, key=str):
        await operations.enqueue_in_session(session, compute_id)

    return len(rows)


async def accept(user: User) -> int:
    """Accept and commit pending Organization invitations for one user."""

    # Keep membership creation and invitation consumption in one transaction.
    async with session_scope() as session:
        accepted = await accept_in_session(session, user)
        if accepted:
            await session.commit()
        return accepted
