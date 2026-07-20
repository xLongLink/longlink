from src import adapters
from uuid import UUID, uuid4
from fastapi import HTTPException
from src.utils import names
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import ComputeStatus, ApplicationStatus, OrganizationStatus
from src.database.session import session_scope
from src.models.countries import DEFAULT_COUNTRY
from src.database.services import operations
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
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


async def for_compute(compute_id: UUID, include_deleted: bool = False) -> list[Organization]:
    """Return Organizations assigned to one compute target."""

    # Reconciliation includes tombstones only when it needs to finish external cleanup.
    async with session_scope() as session:
        conditions = [Organization.compute_id == compute_id]
        if not include_deleted:
            conditions.append(Organization.deleted_at.is_(None))
        statement = select(Organization).where(*conditions)
        result = await session.execute(statement)
        return result.scalars().all()


async def set_runtime(organization_id: UUID, status: OrganizationStatus) -> None:
    """Persist organization runtime state observed by reconciliation."""

    # Runtime status is observed independently from immutable Organization configuration.
    async with session_scope() as session:
        organization = await session.get(Organization, organization_id)
        if organization is None:
            return
        organization.status = status
        await session.commit()


async def purge(organization_id: UUID) -> bool:
    """Hard-delete one organization after all applications and external resources are gone."""

    # The organization tombstone remains until every child application has been purged.
    async with session_scope() as session:
        organization = (
            await session.execute(select(Organization).where(Organization.id == organization_id).with_for_update())
        ).scalar_one_or_none()
        if organization is None:
            return False
        if organization.deleted_at is None:
            raise RuntimeError("Active organizations cannot be purged")
        application = (
            await session.execute(select(Application.id).where(Application.organization_id == organization_id).limit(1))
        ).scalar_one_or_none()
        if application is not None:
            raise RuntimeError("Organization applications must be purged first")
        await session.execute(delete(UserApplication).where(UserApplication.organization_id == organization_id))
        await session.execute(delete(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization_id))
        await session.execute(delete(UserOrganization).where(UserOrganization.organization_id == organization_id))
        await session.execute(delete(Organization).where(Organization.id == organization_id))
        await session.commit()
        return True


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
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def members(organization_id: UUID, include_deleted: bool = False) -> list[tuple[User, UserOrganization]]:
    """Return organization member rows for one organization."""

    # Query memberships with user rows so routes can shape API payloads.
    async with session_scope() as session:
        conditions = [UserOrganization.organization_id == organization_id]

        # Include deleted memberships only when requested by control-plane orchestration.
        if not include_deleted:
            conditions.append(UserOrganization.deleted_at.is_(None))

        statement = select(User, UserOrganization).join(UserOrganization, UserOrganization.user_id == User.id).where(*conditions)
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
    """Change an Organization membership and atomically queue compute reconciliation."""

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

        membership.updated_at = utcnow()
        membership.updated_id = user.id
        membership.role = role
        organization = await session.get(Organization, organization_id)
        if organization is None:
            return False
        compute = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == organization.compute_id).with_for_update())
        ).scalar_one_or_none()
        if compute is None:
            raise RuntimeError("Organization compute registry not found")
        compute.updated_id = user.id
        await operations.enqueue_in_session(session, compute.id)
        await session.commit()
        return True


async def create(
    name: str,
    slug: str,
    compute_id: UUID,
    database_id: UUID,
    storage_id: UUID,
    user: User,
    avatar: str | None = None,
    country: str = DEFAULT_COUNTRY,
    organization_id: UUID | None = None,
) -> Organization:
    """Create an Organization with immutable infrastructure assignments and queue reconciliation."""

    # Validate deterministic runtime resource names before creating the row.
    organization_id = organization_id or uuid4()
    names.knames(slug)
    names.organization_bucket(organization_id)

    # Create the organization and owner membership together.
    async with session_scope() as session:
        # Lock the compute reconciliation root and validate every selected registry in the same transaction.
        compute = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update())
        ).scalar_one_or_none()
        if compute is None or compute.deleted_at is not None:
            raise HTTPException(status_code=404, detail="Compute registry not found")
        if compute.status != ComputeStatus.ready:
            raise HTTPException(status_code=409, detail="Compute registry is not ready")
        database_registry = (
            await session.execute(
                select(DatabaseRegistry).where(
                    DatabaseRegistry.id == database_id,
                    DatabaseRegistry.deleted_at.is_(None),
                ).with_for_update()
            )
        ).scalar_one_or_none()
        storage_registry = (
            await session.execute(
                select(StorageRegistry).where(
                    StorageRegistry.id == storage_id,
                    StorageRegistry.deleted_at.is_(None),
                ).with_for_update()
            )
        ).scalar_one_or_none()
        if database_registry is None:
            raise HTTPException(status_code=404, detail="Database registry not found")
        if storage_registry is None:
            raise HTTPException(status_code=404, detail="Storage registry not found")

        # Derive the immutable Organization connection from its selected database registry.
        shared_schema_url = adapters.database(database_registry).shared_schema_url(organization_id)

        organization = Organization(
            id=organization_id,
            name=name,
            slug=slug,
            avatar=avatar or "",
            country=country,
            compute_id=compute_id,
            database_id=database_id,
            storage_id=storage_id,
            shared_schema_url=shared_schema_url,
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
        compute.updated_id = user.id
        await operations.enqueue_in_session(session, compute.id)

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
            )
            .where(Organization.id == organization.id)
        )
        result = await session.execute(statement)
        return result.scalar_one()


async def soft_delete(organization_id: UUID, user: User) -> Organization | None:
    """Tombstone an Organization and nested state while atomically queueing compute cleanup."""

    # Soft-delete organization data in one transaction.
    async with session_scope() as session:
        current = await session.get(Organization, organization_id)

        # Resolve the parent before taking locks in aggregate order.
        if current is None:
            return None
        compute = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == current.compute_id).with_for_update())
        ).scalar_one_or_none()
        organization = (
            await session.execute(select(Organization).where(Organization.id == organization_id).with_for_update())
        ).scalar_one_or_none()

        # Ignore missing or already-deleted organizations.
        if compute is None or organization is None or organization.deleted_at is not None:
            return None

        now = utcnow()
        organization.status = OrganizationStatus.deleting
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
            application.status = ApplicationStatus.deleting
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

        # Tombstones and their reconciliation request commit atomically.
        compute.updated_id = user.id
        await operations.enqueue_in_session(session, compute.id)

        await session.commit()
        await session.refresh(organization)
        return organization
