from uuid import UUID
from src.utils import roles
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import organizations
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def create(organization_id: UUID, email: str, role: OrganizationRoles, user: User) -> OrganizationInvitation:
    """Create one invitation after checking for duplicates and memberships."""

    normalized_email = email.strip().lower()

    # Use one session for validation and invitation creation.
    async with session_scope() as session:
        # Require an active target organization.
        if (
            await session.scalars(
                select(Organization.id).where(
                    Organization.id == organization_id,
                    Organization.deleted_at.is_(None),
                )
            )
        ).one_or_none() is None:
            raise NotFoundError("Organization not found")

        # Reject emails that already belong to the organization.
        if (
            await session.scalars(
                select(User.id)
                .join(UserOrganization, UserOrganization.user_id == User.id)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.deleted_at.is_(None),
                    func.lower(User.email) == normalized_email,
                )
            )
        ).one_or_none() is not None:
            raise ConflictError("User is already a member")

        # Keep one pending invitation per email address.
        if (
            await session.scalars(
                select(OrganizationInvitation.id).where(
                    OrganizationInvitation.organization_id == organization_id,
                    OrganizationInvitation.deleted_at.is_(None),
                    func.lower(OrganizationInvitation.email) == normalized_email,
                )
            )
        ).one_or_none() is not None:
            raise ConflictError("Invitation already exists")

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
            raise ConflictError("Invitation already exists") from exc

        return invitation


async def accept(user_id: UUID) -> None:
    """Accept pending invitations and synchronize their Organization user projections."""

    # Resolve the recipient before changing invitation or membership state.
    async with session_scope() as session:
        user = await session.get(User, user_id)
        if user is None:
            return

        normalized_email = user.email.strip().lower()

        # Lock matching invitations and retain their exact Organization boundaries.
        rows = (
            await session.execute(
                select(OrganizationInvitation)
                .join(Organization, Organization.id == OrganizationInvitation.organization_id)
                .where(
                    OrganizationInvitation.deleted_at.is_(None),
                    Organization.deleted_at.is_(None),
                    func.lower(OrganizationInvitation.email) == normalized_email,
                )
                .order_by(OrganizationInvitation.organization_id, OrganizationInvitation.created_at, OrganizationInvitation.id)
                .with_for_update()
            )
        ).all()
        if not rows:
            return

        # Group by Organization so duplicate pending rows can never create or elevate multiple memberships.
        organization_invitations: dict[UUID, list[OrganizationInvitation]] = {}
        for (invitation,) in rows:
            organization_invitations.setdefault(invitation.organization_id, []).append(invitation)

        # Lock every existing membership before creating or restoring invitation access.
        memberships = (
            await session.scalars(
                select(UserOrganization)
                .where(
                    UserOrganization.user_id == user.id,
                    UserOrganization.organization_id.in_(organization_invitations),
                )
                .with_for_update()
            )
        ).all()
        memberships_by_organization_id = {membership.organization_id: membership for membership in memberships}

        now = utcnow()
        changed_organization_ids: set[UUID] = set()

        # Create or restore access within each invitation's Organization without changing active roles.
        for organization_id, pending in organization_invitations.items():
            invitation = min(pending, key=lambda item: roles.rank(item.role))
            membership = memberships_by_organization_id.get(organization_id)
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
                changed_organization_ids.add(organization_id)
            elif membership.deleted_at is not None:
                membership.role = invitation.role
                membership.updated_at = now
                membership.updated_id = user.id
                membership.deleted_at = None
                membership.deleted_id = None
                changed_organization_ids.add(organization_id)

            # Consume every matching invitation, including safe duplicate rows.
            for item in pending:
                item.updated_at = now
                item.updated_id = user.id
                item.deleted_at = now
                item.deleted_id = user.id

        await session.commit()

    # Project each committed membership change into its Organization database.
    for organization_id in sorted(changed_organization_ids, key=str):
        await organizations.sync_users(organization_id)
