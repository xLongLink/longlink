from uuid import UUID
from sqlalchemy import delete, select
from sqlalchemy import update as sql_update
from src.errors import ConflictError, ForbiddenError, UnavailableError
from dataclasses import dataclass
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from collections.abc import Sequence
from longlink.shared import users as shared_users
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


@dataclass(frozen=True, slots=True)
class Infrastructure:
    """Hold one Organization and its assigned infrastructure registries."""

    organization: Organization
    compute: ComputeRegistry
    database: DatabaseRegistry
    storage: StorageRegistry


async def infrastructure(organization_id: UUID) -> Infrastructure | None:
    """Return one Organization and a consistent snapshot of its infrastructure assignments."""

    # Resolve every immutable assignment in one database session.
    async with session_scope() as session:
        statement = (
            select(Organization, ComputeRegistry, DatabaseRegistry, StorageRegistry)
            .join(ComputeRegistry, ComputeRegistry.id == Organization.compute_id)
            .join(DatabaseRegistry, DatabaseRegistry.id == Organization.database_id)
            .join(StorageRegistry, StorageRegistry.id == Organization.storage_id)
            .where(Organization.id == organization_id)
        )
        row = (await session.execute(statement)).tuples().one_or_none()
        if row is None:
            return None
        organization, compute, database, storage = row
        return Infrastructure(organization=organization, compute=compute, database=database, storage=storage)


async def application_access(user_id: UUID, application_id: UUID) -> tuple[Application, Organization, OrganizationRoles] | None:
    """Return one Application, its Organization, and a user's active Organization role."""

    # Resolve only the requested Application and active Organization membership.
    async with session_scope() as session:
        statement = (
            select(Application, Organization, UserOrganization.role)
            .join(Organization, Organization.id == Application.organization_id)
            .join(
                UserOrganization,
                UserOrganization.organization_id == Organization.id,
            )
            .where(
                Application.id == application_id,
                Application.deleted_at.is_(None),
                Organization.deleted_at.is_(None),
                UserOrganization.user_id == user_id,
                UserOrganization.deleted_at.is_(None),
            )
        )
        row = (await session.execute(statement)).one_or_none()
        if row is None:
            return None
        application, organization, role = row
        return application, organization, role


async def fetch() -> Sequence[Organization]:
    """Return all organizations in the database."""

    # Load active organizations.
    async with session_scope() as session:
        statement = select(Organization).where(Organization.deleted_at.is_(None))
        return (await session.scalars(statement)).all()


async def set_runtime(organization_id: UUID, expected_status: Status, status: Status) -> bool:
    """Transition one active Organization from the expected lifecycle state."""

    # Guard lifecycle writes from stale attempts after deletion or another transition.
    async with session_scope() as session:
        if (
            await session.execute(
                sql_update(Organization)
                .where(
                    Organization.id == organization_id,
                    Organization.deleted_at.is_(None),
                    Organization.status == expected_status,
                )
                .values(status=status)
            )
        ).rowcount != 1:
            return False
        await session.commit()
        return True


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


async def applications(organization_id: UUID, include_deleted: bool = False) -> Sequence[Application]:
    """Return applications for one organization."""

    # Query organization applications in one session.
    async with session_scope() as session:
        statement = select(Application).where(Application.organization_id == organization_id)

        # Include deleted rows only when requested.
        if not include_deleted:
            statement = statement.where(Application.deleted_at.is_(None))

        statement = statement.order_by(Application.created_at.asc())
        return (await session.scalars(statement)).all()


async def invitations(organization_id: UUID) -> Sequence[OrganizationInvitation]:
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
        return (await session.scalars(statement)).all()


async def get(organization_id: UUID, include_deleted: bool = False) -> Organization | None:
    """Return one organization by id with related rows loaded."""

    # Load organization details through one managed session.
    async with session_scope() as session:
        statement = select(Organization).where(Organization.id == organization_id)

        # Exclude deleted organizations unless requested.
        if not include_deleted:
            statement = statement.where(Organization.deleted_at.is_(None))

        return (await session.scalars(statement)).one_or_none()


async def members(organization_id: UUID, include_deleted: bool = False) -> Sequence[UserOrganization]:
    """Return organization member rows for one organization."""

    # Query memberships with their users so detached callers can shape API payloads.
    async with session_scope() as session:
        statement = (
            select(UserOrganization).options(joinedload(UserOrganization.user)).where(UserOrganization.organization_id == organization_id)
        )

        # Include deleted memberships only when requested by control-plane orchestration.
        if not include_deleted:
            statement = statement.where(UserOrganization.deleted_at.is_(None))

        return (await session.scalars(statement)).all()


async def sync_users(organization_id: UUID, db: Postgres | None = None) -> None:
    """Project Platform-owned users and memberships into one Organization database."""

    # Ignore removed Organizations that no longer own a shared database projection.
    assigned = await infrastructure(organization_id)
    if assigned is None or assigned.organization.deleted_at is not None:
        return
    if assigned.organization.status != Status.running and db is None:
        return

    # Build the shared-schema user snapshot from Platform-authoritative memberships.
    memberships = await members(organization_id, include_deleted=True)
    users: list[shared_users.UserRow] = []
    for membership in memberships:
        user = membership.user
        deleted_at = max((item for item in (user.deleted_at, membership.deleted_at) if item is not None), default=None)
        updated_at = max(user.updated_at, membership.updated_at, deleted_at or user.updated_at)
        users.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "avatar": user.avatar,
                "role": membership.role.value,
                "created_at": membership.created_at,
                "updated_at": updated_at,
                "deleted_at": deleted_at,
            }
        )

    # The Platform is authoritative; reuse the prepared client during Organization creation.
    if db is None:
        database = assigned.database
        db = Postgres(database.host, database.port, database.username, database.password, database.sslmode)
    await shared_users.sync_url(db.shared_schema_url(organization_id), users)


async def update_member_role(
    organization_id: UUID,
    member_id: UUID,
    role: OrganizationRoles,
    user: User,
    caller_role: OrganizationRoles,
) -> bool:
    """Change one active Organization membership and synchronize its user projection."""

    # Update the member role inside one transaction.
    async with session_scope() as session:
        statement = (
            select(UserOrganization)
            .join(User, User.id == UserOrganization.user_id)
            .join(Organization, Organization.id == UserOrganization.organization_id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.user_id == member_id,
                UserOrganization.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
        )

        # Require an active organization membership.
        row = (await session.execute(statement)).one_or_none()
        if row is None:
            return False
        membership = row[0]

        # Only owners may grant or change owner access.
        if (membership.role == OrganizationRoles.owner or role == OrganizationRoles.owner) and caller_role != OrganizationRoles.owner:
            raise ForbiddenError("Owner management permissions required")

        # Repeated role assignments do not require persistence or reconciliation.
        if membership.role == role:
            return True

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
                raise ConflictError("Organization must have at least one owner")

        # Persist the role change.
        membership.updated_at = utcnow()
        membership.updated_id = user.id
        membership.role = role

        await session.commit()

    # Project the committed membership change into the Organization database.
    await sync_users(organization_id)
    return True


async def create(
    name: str,
    slug: str,
    user: User,
    avatar: str | None = None,
    *,
    compute_id: UUID,
    storage_id: UUID,
    database_id: UUID,
) -> Organization:
    """Create an Organization with the specified infrastructure."""

    # Create the organization and owner membership together.
    async with session_scope() as session:
        # Lock the requested running compute registry.
        compute_statement = select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update()
        compute = (await session.scalars(compute_statement)).one_or_none()
        if compute is None:
            raise UnavailableError("No compute registry available")
        if compute.status != Status.running:
            raise UnavailableError("No ready compute registry available")

        # Lock the requested database registry.
        database_statement = select(DatabaseRegistry).where(DatabaseRegistry.id == database_id).with_for_update()
        database_registry = (await session.scalars(database_statement)).one_or_none()
        if database_registry is None:
            raise UnavailableError("No database registry available")

        # Lock the requested storage registry.
        storage_statement = select(StorageRegistry).where(StorageRegistry.id == storage_id).with_for_update()
        storage_registry = (await session.scalars(storage_statement)).one_or_none()
        if storage_registry is None:
            raise UnavailableError("No storage registry available")

        # Build the Organization with its immutable infrastructure assignments.
        organization = Organization(
            name=name,
            slug=slug,
            avatar=avatar or "",
            compute_id=compute_id,
            database_id=database_id,
            storage_id=storage_id,
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

        # Translate unique conflicts from autoflush or commit.
        try:
            await session.flush()
            await operations.enqueue(
                session,
                organization.compute_id,
                kind=OperationKind.organization_create,
                target_id=organization.id,
            )
            await session.commit()

        # Keep Organization uniqueness collisions at the service boundary as an API conflict.
        except IntegrityError as exc:
            raise ConflictError("Organization already exists") from exc

        return organization


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
        if organization.avatar == avatar:
            return organization
        organization.avatar = avatar
        organization.updated_at = utcnow()
        organization.updated_id = user.id
        await session.commit()

        return organization


async def soft_delete(organization_id: UUID, user: User) -> Organization | None:
    """Tombstone an Organization and nested state."""

    # Soft-delete organization data in one transaction.
    async with session_scope() as session:
        # Lock the Organization state before tombstoning its nested rows.
        organization = await session.get(Organization, organization_id, with_for_update=True)
        if organization is None:
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

        # Keep tombstones and Organization cleanup in one transaction.
        await operations.enqueue(
            session,
            organization.compute_id,
            kind=OperationKind.organization_delete,
            target_id=organization.id,
        )
        await session.commit()

    return organization
