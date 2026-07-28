from src import adapters
from uuid import UUID, uuid4
from fastapi import HTTPException
from sqlmodel import col
from src.utils import names
from sqlalchemy import delete, select
from sqlalchemy import update as sql_update
from dataclasses import dataclass
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.operations import Operation
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


@dataclass(frozen=True, slots=True)
class Infrastructure:
    """Hold one Organization and its assigned infrastructure registries."""

    organization: Organization
    compute: ComputeRegistry | None
    database: DatabaseRegistry | None
    storage: StorageRegistry | None


async def infrastructure(organization_id: UUID, include_deleted: bool = False) -> Infrastructure | None:
    """Return one Organization and a consistent snapshot of its infrastructure assignments."""

    # Resolve every immutable assignment in one database session.
    async with session_scope() as session:
        statement = (
            select(Organization, ComputeRegistry, DatabaseRegistry, StorageRegistry)
            .outerjoin(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
            .outerjoin(DatabaseRegistry, col(DatabaseRegistry.id) == col(Organization.database_id))
            .outerjoin(StorageRegistry, col(StorageRegistry.id) == col(Organization.storage_id))
            .where(col(Organization.id) == organization_id)
        )
        if not include_deleted:
            statement = statement.where(col(Organization.deleted_at).is_(None))
        row = (await session.execute(statement)).tuples().one_or_none()
        if row is None:
            return None
        organization, compute, database, storage = row
        return Infrastructure(organization=organization, compute=compute, database=database, storage=storage)


async def fetch() -> list[Organization]:
    """Return all organizations in the database."""

    # Load active organizations with audit users.
    async with session_scope() as session:
        statement = (
            select(Organization)
            .options(
                joinedload(Organization.created_by),
                joinedload(Organization.updated_by),
                joinedload(Organization.deleted_by),
            )
            .where(Organization.deleted_at.is_(None))
        )
        return list(await session.scalars(statement))


async def set_runtime(organization_id: UUID, expected_status: Status, status: Status) -> bool:
    """Transition one active Organization from the expected lifecycle state."""

    # Guard lifecycle writes from stale attempts after deletion or another transition.
    async with session_scope() as session:
        result = await session.execute(
            sql_update(Organization)
            .where(
                Organization.id == organization_id,
                Organization.deleted_at.is_(None),
                Organization.status == expected_status,
            )
            .values(status=status)
        )
        await session.commit()
        return result.rowcount == 1


async def purge(organization_id: UUID) -> None:
    """Hard-delete one organization after all applications and external resources are gone."""

    # The organization tombstone remains until every child application has been purged.
    async with session_scope() as session:
        organization = await session.get(Organization, organization_id, with_for_update=True)
        if organization is None:
            return
        if organization.deleted_at is None:
            raise RuntimeError("Active organizations cannot be purged")
        application_id = await session.scalar(select(Application.id).where(Application.organization_id == organization_id).limit(1))
        if application_id is not None:
            raise RuntimeError("Organization applications must be purged first")
        await session.execute(delete(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization_id))
        await session.execute(delete(UserOrganization).where(UserOrganization.organization_id == organization_id))
        await session.execute(delete(Organization).where(Organization.id == organization_id))
        await session.commit()


async def applications(organization_id: UUID, include_deleted: bool = False) -> list[Application]:
    """Return applications for one organization."""

    # Query organization applications in one session.
    async with session_scope() as session:
        statement = select(Application).where(Application.organization_id == organization_id)

        # Include deleted rows only when requested.
        if not include_deleted:
            statement = statement.where(Application.deleted_at.is_(None))

        statement = statement.order_by(Application.created_at.asc())
        return list(await session.scalars(statement))


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
        return list(await session.scalars(statement))


async def get(organization_id: UUID, include_deleted: bool = False) -> Organization | None:
    """Return one organization by id with related rows loaded."""

    # Load organization details through one managed session.
    async with session_scope() as session:
        statement = (
            select(Organization)
            .options(
                joinedload(Organization.created_by),
                joinedload(Organization.updated_by),
                joinedload(Organization.deleted_by),
            )
            .where(Organization.id == organization_id)
        )

        # Exclude deleted organizations unless requested.
        if not include_deleted:
            statement = statement.where(Organization.deleted_at.is_(None))

        return (await session.scalars(statement)).one_or_none()


async def members(organization_id: UUID, include_deleted: bool = False) -> list[UserOrganization]:
    """Return organization member rows for one organization."""

    # Query memberships with their users so detached callers can shape API payloads.
    async with session_scope() as session:
        statement = (
            select(UserOrganization).options(joinedload(UserOrganization.user)).where(UserOrganization.organization_id == organization_id)
        )

        # Include deleted memberships only when requested by control-plane orchestration.
        if not include_deleted:
            statement = statement.where(UserOrganization.deleted_at.is_(None))

        return list(await session.scalars(statement))


async def membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles | None:
    """Return one member role for an organization."""

    # Query one active organization membership role.
    async with session_scope() as session:
        statement = select(UserOrganization.role).where(
            UserOrganization.organization_id == organization_id,
            UserOrganization.user_id == user_id,
            UserOrganization.deleted_at.is_(None),
        )
        return (await session.scalars(statement)).one_or_none()


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

        # Require an active organization membership.
        membership = (await session.scalars(statement)).one_or_none()
        if membership is None:
            return False

        # Protect organizations from losing their last owner.
        if membership.role == OrganizationRoles.owner and role != OrganizationRoles.owner:
            # Reject demotion when this is the only owner.
            owner_statement = (
                select(UserOrganization.user_id)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.role == OrganizationRoles.owner,
                    UserOrganization.deleted_at.is_(None),
                )
                .with_for_update()
            )
            owner_ids = (await session.scalars(owner_statement)).all()
            if len(owner_ids) <= 1:
                raise HTTPException(status_code=409, detail="Organization must have at least one owner")

        # Persist the role change and queue reconciliation on the Organization's compute.
        membership.updated_at = utcnow()
        membership.updated_id = user.id
        membership.role = role
        organization = await session.get(Organization, organization_id)
        if organization is None:
            return False
        compute = await session.get(ComputeRegistry, organization.compute_id, with_for_update=True)
        if compute is None:
            raise RuntimeError("Organization compute registry not found")
        await operations.enqueue_in_session(
            session,
            compute.id,
            locked_compute=compute,
            kind=OperationKind.organization_reconcile,
            target_id=organization.id,
        )
        await session.commit()
        return True


async def create(name: str, slug: str, user: User, avatar: str | None = None) -> tuple[Organization, Operation]:
    """Create an Organization with automatically assigned infrastructure and queue reconciliation."""

    # Validate the user-derived runtime namespace before creating the row.
    organization_id = uuid4()
    names.knames(slug)

    # Create the organization and owner membership together.
    async with session_scope() as session:
        # Lock the first ready compute reconciliation root.
        compute_statement = (
            select(ComputeRegistry).where(ComputeRegistry.status == Status.running).order_by(ComputeRegistry.id).limit(1).with_for_update()
        )
        compute = (await session.scalars(compute_statement)).one_or_none()
        if compute is None:
            raise HTTPException(status_code=503, detail="No compute registry available")

        # Lock the first available database registry.
        database_statement = select(DatabaseRegistry).order_by(DatabaseRegistry.id).limit(1).with_for_update()
        database_registry = (await session.scalars(database_statement)).one_or_none()
        if database_registry is None:
            raise HTTPException(status_code=503, detail="No database registry available")

        # Lock the first available storage registry.
        storage_statement = select(StorageRegistry).order_by(StorageRegistry.id).limit(1).with_for_update()
        storage_registry = (await session.scalars(storage_statement)).one_or_none()
        if storage_registry is None:
            raise HTTPException(status_code=503, detail="No storage registry available")

        # Derive the immutable Organization connection from its assigned database registry.
        db = adapters.Postgres(
            database_registry.host,
            database_registry.port,
            database_registry.username,
            database_registry.password,
            database_registry.sslmode,
        )
        shared_schema_url = db.shared_schema_url(organization_id)

        # Build the Organization with its immutable infrastructure assignments.
        organization = Organization(
            id=organization_id,
            name=name,
            slug=slug,
            avatar=avatar or "",
            compute_id=compute.id,
            database_id=database_registry.id,
            storage_id=storage_registry.id,
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

        # Queue reconciliation and translate unique conflicts from autoflush or commit.
        try:
            operation = await operations.enqueue_in_session(
                session,
                compute.id,
                locked_compute=compute,
                kind=OperationKind.organization_create,
                target_id=organization.id,
            )
            await session.commit()

        # Keep Organization uniqueness collisions at the service boundary as an API conflict.
        except IntegrityError as exc:
            raise HTTPException(status_code=409, detail="Organization already exists") from exc

        # Reload audit relationships required by the mutation response.
        organization = (
            await session.scalars(
                select(Organization)
                .options(
                    joinedload(Organization.created_by),
                    joinedload(Organization.updated_by),
                    joinedload(Organization.deleted_by),
                )
                .where(Organization.id == organization.id)
            )
        ).one()
        return organization, operation


async def update(organization_id: UUID, avatar: str, user: User) -> Organization | None:
    """Update mutable Organization metadata."""

    # Lock and update the active Organization row.
    async with session_scope() as session:
        organization = (
            await session.scalars(
                select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_(None)).with_for_update()
            )
        ).one_or_none()
        if organization is None:
            return None
        organization.avatar = avatar
        organization.updated_at = utcnow()
        organization.updated_id = user.id
        await session.commit()

        # Load audit relationships required by the organization response.
        statement = (
            select(Organization)
            .options(
                joinedload(Organization.created_by),
                joinedload(Organization.updated_by),
                joinedload(Organization.deleted_by),
            )
            .where(Organization.id == organization.id)
        )
        return (await session.scalars(statement)).one()


async def soft_delete(organization_id: UUID, user: User) -> tuple[Organization, Operation] | None:
    """Tombstone an Organization and nested state while atomically queueing compute cleanup."""

    # Soft-delete organization data in one transaction.
    async with session_scope() as session:
        # Resolve the parent before taking locks in aggregate order.
        current = await session.get(Organization, organization_id)
        if current is None:
            return None

        # Lock the aggregate resources and stop if any disappear during acquisition.
        compute = await session.get(ComputeRegistry, current.compute_id, with_for_update=True)
        organization = (
            await session.scalars(select(Organization).where(Organization.id == organization_id).with_for_update())
        ).one_or_none()
        if compute is None or organization is None:
            return None

        # Record nested tombstones once; repeated requests only ensure cleanup remains queued.
        if organization.deleted_at is None:
            now = utcnow()
            organization.status = Status.deleting
            organization.deleted_at = now
            organization.deleted_id = user.id
            organization.updated_at = now
            organization.updated_id = user.id

            # Apply the same deletion audit state to every active nested row without loading each object.
            tombstone = {
                "deleted_at": now,
                "deleted_id": user.id,
                "updated_at": now,
                "updated_id": user.id,
            }
            await session.execute(
                sql_update(Application)
                .where(
                    Application.organization_id == organization_id,
                    Application.deleted_at.is_(None),
                )
                .values(status=Status.deleting, **tombstone)
            )
            await session.execute(
                sql_update(UserApplication)
                .where(
                    UserApplication.organization_id == organization_id,
                    UserApplication.deleted_at.is_(None),
                )
                .values(**tombstone)
            )
            await session.execute(
                sql_update(UserOrganization)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.deleted_at.is_(None),
                )
                .values(**tombstone)
            )
            await session.execute(
                sql_update(OrganizationInvitation)
                .where(
                    OrganizationInvitation.organization_id == organization_id,
                    OrganizationInvitation.deleted_at.is_(None),
                )
                .values(**tombstone)
            )

        # Tombstones and their reconciliation request commit atomically.
        operation = await operations.enqueue_in_session(
            session,
            compute.id,
            locked_compute=compute,
            kind=OperationKind.organization_delete,
            target_id=organization.id,
        )

        await session.commit()

        # Reload audit relationships required by the mutation response.
        organization = (
            await session.scalars(
                select(Organization)
                .options(
                    joinedload(Organization.created_by),
                    joinedload(Organization.updated_by),
                    joinedload(Organization.deleted_by),
                )
                .where(Organization.id == organization.id)
            )
        ).one()
        return organization, operation
