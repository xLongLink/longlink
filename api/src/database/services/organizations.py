from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime
from src.utils import names
from sqlalchemy import delete, select
from tenant.models import User as TenantUser
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.models.countries import DEFAULT_COUNTRY
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch() -> list[Organization]:
    """Return all organizations in the database."""

    # Load active organizations with audit users.
    async with session_scope() as session:
        statement = (
            select(Organization)
            .options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
            )
            .where(Organization.deleted_at.is_(None))
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def applications(organization_id: UUID, include_deleted: bool = False) -> list[Application]:
    """Return applications for one organization."""

    # Query organization applications in one session.
    async with session_scope() as session:
        conditions = [Application.organization_id == organization_id]

        # Include deleted rows only when requested.
        if not include_deleted:
            conditions.append(Application.deleted_at.is_(None))

        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(*conditions)
            .order_by(Application.created_at.asc())
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def invitations(organization_id: UUID) -> list[OrganizationInvitation]:
    """Return active invitations for one organization."""

    # Query organization invitations in one session.
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


async def database_users(organization_id: UUID) -> list[TenantUser]:
    """Return organization user state for shared user synchronization."""

    # Load memberships for tenant user synchronization.
    async with session_scope() as session:
        statement = (
            select(
                User,
                UserOrganization.role,
                UserOrganization.created_at,
                UserOrganization.updated_at,
                UserOrganization.deleted_at,
            )
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .where(UserOrganization.organization_id == organization_id)
            .order_by(User.email)
        )
        result = await session.execute(statement)
        rows = result.all()

        database_users: list[TenantUser] = []

        # Convert each membership row to the tenant-facing user snapshot.
        for user, role, created_at, updated_at, membership_deleted_at in rows:
            # A shared user becomes inactive when either the account or organization membership is inactive.
            deleted_at = user.deleted_at

            # Use the newest deletion timestamp for the tenant row.
            if membership_deleted_at is not None and (deleted_at is None or membership_deleted_at > deleted_at):
                deleted_at = membership_deleted_at

            # The tenant row should advance when profile, membership, or deactivation state changes.
            tenant_updated_at = max(user.updated_at, updated_at)

            # Include deletion changes in the tenant update timestamp.
            if deleted_at is not None and deleted_at > tenant_updated_at:
                tenant_updated_at = deleted_at

            database_users.append(
                TenantUser(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    avatar=user.avatar,
                    role=role.value,
                    created_at=created_at,
                    updated_at=tenant_updated_at,
                    deleted_at=deleted_at,
                )
            )

        return database_users


async def get(organization_id: UUID, include_deleted: bool = False) -> Organization | None:
    """Return one organization by id with related rows loaded."""

    # Load organization details through one managed session.
    async with session_scope() as session:
        conditions = [Organization.id == organization_id]

        # Exclude deleted organizations unless requested.
        if not include_deleted:
            conditions.append(Organization.deleted_at.is_(None))

        statement = (
            select(Organization)
            .options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def members(organization_id: UUID) -> list[tuple[User, UserOrganization]]:
    """Return active organization member rows for one organization."""

    # Query memberships with user rows so routes can shape API payloads.
    async with session_scope() as session:
        statement = (
            select(User, UserOrganization)
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.deleted_at.is_(None),
            )
        )
        result = await session.execute(statement)
        return [(user, membership) for user, membership in result.all()]


async def membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles | None:
    """Return one member role for an organization."""

    # Query one active organization membership role.
    async with session_scope() as session:
        statement = select(UserOrganization.role).where(
            UserOrganization.organization_id == organization_id,
            UserOrganization.user_id == user_id,
            UserOrganization.deleted_at.is_(None),
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def update_member_role(organization_id: UUID, member_id: UUID, role: OrganizationRoles, user: User) -> bool:
    """Update one active organization member role."""

    # Update the member role inside one transaction.
    async with session_scope() as session:
        statement = (
            select(UserOrganization)
            .join(User, User.id == UserOrganization.user_id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.user_id == member_id,
                UserOrganization.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
        )
        result = await session.execute(statement)

        # Require an active organization membership.
        membership = result.scalar_one_or_none()
        if membership is None:
            return False

        # Protect organizations from losing their last owner.
        if membership.role == OrganizationRoles.owner and role != OrganizationRoles.owner:
            owner_statement = (
                select(UserOrganization.user_id)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.role == OrganizationRoles.owner,
                    UserOrganization.deleted_at.is_(None),
                )
                .with_for_update()
            )
            owner_result = await session.execute(owner_statement)

            # Reject demotion when this is the only owner.
            if len(owner_result.scalars().all()) <= 1:
                raise HTTPException(status_code=409, detail="Organization must have at least one owner")

        membership.updated_at = datetime.now(UTC)
        membership.updated_id = user.id
        membership.role = role
        await session.commit()
        return True


async def create(
    name: str,
    slug: str,
    location_id: UUID,
    user: User,
    avatar: str | None = None,
    country: str = DEFAULT_COUNTRY,
) -> Organization:
    """Create an organization."""

    names.organization_database(slug)
    names.organization_shared_bucket(slug)

    # Create the organization and owner membership together.
    async with session_scope() as session:
        organization = Organization(
            name=name,
            slug=slug,
            avatar=avatar or "",
            country=country,
            location_id=location_id,
        )

        # Attach the creator as the initial owner for every organization.
        organization.created_id = user.id
        organization.updated_id = user.id
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=organization.id,
                role=OrganizationRoles.owner,
                created_id=user.id,
                updated_id=user.id,
            )
        )
        session.add(organization)

        # Commit creation and translate unique conflicts.
        try:
            await session.commit()

        # Keep name collisions at the service boundary as an API conflict.
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Organization already exists") from exc

        statement = (
            select(Organization)
            .options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location),
            )
            .where(Organization.id == organization.id)
        )
        result = await session.execute(statement)
        return result.scalar_one()


async def discard_created(organization_id: UUID) -> None:
    """Hard-delete an organization created by a failed synchronous bootstrap."""

    # Remove dependent rows before deleting the organization row so creation can be retried with the same name.
    async with session_scope() as session:
        await session.execute(delete(UserApplication).where(UserApplication.organization_id == organization_id))
        await session.execute(delete(Application).where(Application.organization_id == organization_id))
        await session.execute(delete(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization_id))
        await session.execute(delete(UserOrganization).where(UserOrganization.organization_id == organization_id))
        await session.execute(delete(Organization).where(Organization.id == organization_id))
        await session.commit()


async def soft_delete(organization_id: UUID, user: User) -> Organization | None:
    """Soft-delete an organization and all nested access rows."""

    # Soft-delete organization data in one transaction.
    async with session_scope() as session:
        organization = await session.get(Organization, organization_id)

        # Ignore missing or already-deleted organizations.
        if organization is None or organization.deleted_at is not None:
            return None

        now = datetime.now(UTC)
        organization.deleted_at = now
        organization.deleted_id = user.id
        organization.updated_at = now
        organization.updated_id = user.id

        applications_result = await session.execute(
            select(Application).where(
                Application.organization_id == organization_id,
                Application.deleted_at.is_(None),
            )
        )

        # Mark active applications as deleted.
        for application in applications_result.scalars().all():
            application.deleted_at = now
            application.deleted_id = user.id
            application.updated_at = now
            application.updated_id = user.id

        user_applications_result = await session.execute(
            select(UserApplication).where(
                UserApplication.organization_id == organization_id,
                UserApplication.deleted_at.is_(None),
            )
        )

        # Mark application memberships as deleted.
        for membership in user_applications_result.scalars().all():
            membership.deleted_at = now
            membership.deleted_id = user.id
            membership.updated_at = now
            membership.updated_id = user.id

        user_organizations_result = await session.execute(
            select(UserOrganization).where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.deleted_at.is_(None),
            )
        )

        # Mark organization memberships as deleted.
        for membership in user_organizations_result.scalars().all():
            membership.deleted_at = now
            membership.deleted_id = user.id
            membership.updated_at = now
            membership.updated_id = user.id

        invitations_result = await session.execute(
            select(OrganizationInvitation).where(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.deleted_at.is_(None),
            )
        )

        # Mark active invitations as deleted.
        for invitation in invitations_result.scalars().all():
            invitation.deleted_at = now
            invitation.deleted_id = user.id
            invitation.updated_at = now
            invitation.updated_id = user.id

        await session.commit()
        await session.refresh(organization)
        return organization
