from uuid import UUID
from src.utils import names
from sqlalchemy import func, delete, select
from sqlalchemy import update as sql_update
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from dataclasses import dataclass
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, joinedload, contains_eager
from collections.abc import Sequence
from longlink.shared import audit as shared_audit
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.adapters.postgres import Postgres
from src.database.services import operations
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.operations import Operation
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


async def membership(session: AsyncSession, user_id: UUID, organization_id: UUID) -> UserOrganization | None:
    """Return one user's active membership for an active Organization."""

    # Load only the requested Organization membership and its response-ready Organization.
    statement = (
        select(UserOrganization)
        .join(Organization, Organization.id == UserOrganization.organization_id)
        .options(contains_eager(UserOrganization.organization))
        .where(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == organization_id,
            UserOrganization.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
    )
    return await session.scalar(statement)


async def application_runtime_access(
    session: AsyncSession, user_id: UUID, application_id: UUID
) -> tuple[Application, Organization, OrganizationRoles, ComputeRegistry] | None:
    """Return one user's active application access with its compute registry."""

    # Resolve the requested runtime and its active Organization membership in one scoped query.
    result = await session.execute(
        select(Application, Organization, UserOrganization.role, ComputeRegistry)
        .join(Organization, Organization.id == Application.organization_id)
        .join(UserOrganization, UserOrganization.organization_id == Organization.id)
        .join(ComputeRegistry, ComputeRegistry.id == Organization.compute_id)
        .where(
            Application.id == application_id,
            Application.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
            UserOrganization.user_id == user_id,
            UserOrganization.deleted_at.is_(None),
        )
    )
    return result.tuples().one_or_none()


async def infrastructure(session: AsyncSession, organization_id: UUID) -> Infrastructure | None:
    """Return one Organization and a consistent snapshot of its infrastructure assignments."""

    result = await session.execute(
        select(Organization, ComputeRegistry, DatabaseRegistry, StorageRegistry)
        .join(ComputeRegistry, ComputeRegistry.id == Organization.compute_id)
        .join(DatabaseRegistry, DatabaseRegistry.id == Organization.database_id)
        .join(StorageRegistry, StorageRegistry.id == Organization.storage_id)
        .where(Organization.id == organization_id)
    )
    row = result.tuples().one_or_none()
    if row is None:
        return None
    organization, compute, database, storage = row
    return Infrastructure(organization=organization, compute=compute, database=database, storage=storage)


async def application_infrastructure(session: AsyncSession, application_id: UUID) -> tuple[Application, Infrastructure] | None:
    """Return one Application and its assigned infrastructure."""

    # Load the Application and its infrastructure in one lifecycle query.
    statement = (
        select(Application, Organization, ComputeRegistry, DatabaseRegistry, StorageRegistry)
        .join(Organization, Organization.id == Application.organization_id)
        .join(ComputeRegistry, ComputeRegistry.id == Organization.compute_id)
        .join(DatabaseRegistry, DatabaseRegistry.id == Organization.database_id)
        .join(StorageRegistry, StorageRegistry.id == Organization.storage_id)
        .where(Application.id == application_id)
    )
    result = await session.execute(statement)
    row = result.tuples().one_or_none()
    if row is None:
        return None
    application, organization, compute, database, storage = row
    return application, Infrastructure(organization=organization, compute=compute, database=database, storage=storage)


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[Organization], int]:
    """Return one ordered page of active organizations for administrator views."""

    # Query active organization rows using a stable page order.
    statement = (
        select(Organization)
        .where(Organization.deleted_at.is_(None))
        .order_by(Organization.name, Organization.id)
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count only active organizations visible in the listing.
    count_result = await session.execute(select(func.count()).select_from(Organization).where(Organization.deleted_at.is_(None)))
    return result.all(), count_result.scalar_one()


async def purge(session: AsyncSession, organization_id: UUID) -> None:
    """Hard-delete one organization after all applications and external resources are gone."""

    # The organization tombstone remains until lifecycle cleanup has purged every child application.
    organization = await session.get(Organization, organization_id, with_for_update=True)
    if organization is None:
        return
    await session.delete(organization)


async def applications(session: AsyncSession, organization_id: UUID) -> Sequence[Application]:
    """Return applications for one organization."""

    # Query active organization applications in one session.
    statement = (
        select(Application)
        .options(defer(Application.secrets))
        .where(
            Application.organization_id == organization_id,
            Application.deleted_at.is_(None),
        )
        .order_by(Application.created_at.asc())
    )
    result = await session.scalars(statement)
    return result.all()


async def invitations(session: AsyncSession, organization_id: UUID) -> Sequence[OrganizationInvitation]:
    """Return active email grants for one organization."""

    # Query organization invitations in one session.
    statement = (
        select(OrganizationInvitation)
        .join(Organization, Organization.id == OrganizationInvitation.organization_id)
        .where(
            OrganizationInvitation.organization_id == organization_id,
            Organization.deleted_at.is_(None),
        )
        .order_by(OrganizationInvitation.created_at.desc())
    )
    result = await session.scalars(statement)
    return result.all()


async def members(session: AsyncSession, organization_id: UUID) -> Sequence[UserOrganization]:
    """Return active organization member rows for one organization."""

    # Query memberships with their users so detached callers can shape API payloads.
    statement = (
        select(UserOrganization)
        .options(joinedload(UserOrganization.user))
        .where(
            UserOrganization.organization_id == organization_id,
            UserOrganization.deleted_at.is_(None),
        )
    )

    result = await session.scalars(statement)
    return result.all()


async def sync_users(session: AsyncSession, organization_id: UUID) -> None:
    """Project users into one active, running Organization database."""

    # Load the active running Organization with its assigned database.
    result = await session.execute(
        select(Organization, DatabaseRegistry)
        .join(DatabaseRegistry, DatabaseRegistry.id == Organization.database_id)
        .where(
            Organization.id == organization_id,
            Organization.deleted_at.is_(None),
            Organization.status == Status.running,
        )
    )
    assigned = result.tuples().one_or_none()
    if assigned is None:
        return
    organization, database = assigned
    db = Postgres(database.host, database.port, database.username, database.password, database.sslmode)

    # Include deleted memberships so the Organization database receives tombstones.
    memberships_statement = (
        select(UserOrganization).options(joinedload(UserOrganization.user)).where(UserOrganization.organization_id == organization.id)
    )
    memberships_result = await session.scalars(memberships_statement)
    memberships = memberships_result.all()

    # Build the shared-schema user snapshot from Platform-authoritative memberships.
    rows = [
        Audit(
            id=membership.user.id,
            name=membership.user.name,
            email=membership.user.email,
            avatar=membership.user.avatar,
            role=membership.role.value,
            created_at=membership.created_at,
            deleted_at=(
                deleted_at := max((item for item in (membership.user.deleted_at, membership.deleted_at) if item is not None), default=None)
            ),
            updated_at=max(membership.user.updated_at, membership.updated_at, deleted_at or membership.user.updated_at),
        )
        for membership in memberships
    ]

    # The Platform is authoritative over Organization user projections.
    await shared_audit.sync(db.url(organization.id.hex, search_path="shared").render_as_string(hide_password=False), rows)


async def update_member_role(
    session: AsyncSession,
    organization_id: UUID,
    member_id: UUID,
    role: OrganizationRoles,
    user: User,
    caller_role: OrganizationRoles,
) -> bool:
    """Change one active Organization membership role."""

    # Update the member role inside one transaction.
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
    result = await session.scalars(statement)
    membership = result.one_or_none()
    if membership is None:
        raise NotFoundError("Organization member not found")

    # Only owners may grant or change owner access.
    if (membership.role == OrganizationRoles.owner or role == OrganizationRoles.owner) and caller_role != OrganizationRoles.owner:
        raise ForbiddenError("Owner management permissions required")

    # Repeated role assignments do not require persistence or reconciliation.
    if membership.role == role:
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
        result = await session.scalars(owner_statement)
        owner_ids = result.all()
        if len(owner_ids) <= 1:
            raise ConflictError("Organization must have at least one owner")

    # Persist the role change.
    membership.updated_id = user.id
    membership.role = role

    return True


async def create_default(session: AsyncSession, name: str, user: User) -> Organization:
    """Create an Organization on the least-assigned available infrastructure."""

    # Lock the selected Compute until the Organization assignment is committed.
    compute_assignments = (
        select(func.count(Organization.id))
        .where(Organization.compute_id == ComputeRegistry.id, Organization.deleted_at.is_(None))
        .scalar_subquery()
    )
    compute_id = await session.scalar(
        select(ComputeRegistry.id)
        .where(ComputeRegistry.status == Status.running)
        .order_by(compute_assignments, ComputeRegistry.name)
        .limit(1)
        .with_for_update()
    )
    if compute_id is None:
        raise UnavailableError("No ready compute registry available")

    # Lock the selected Database until the Organization assignment is committed.
    database_assignments = (
        select(func.count(Organization.id))
        .where(Organization.database_id == DatabaseRegistry.id, Organization.deleted_at.is_(None))
        .scalar_subquery()
    )
    database_id = await session.scalar(
        select(DatabaseRegistry.id).order_by(database_assignments, DatabaseRegistry.name).limit(1).with_for_update()
    )
    if database_id is None:
        raise UnavailableError("No database registry available")

    # Lock the selected Storage until the Organization assignment is committed.
    storage_assignments = (
        select(func.count(Organization.id))
        .where(Organization.storage_id == StorageRegistry.id, Organization.deleted_at.is_(None))
        .scalar_subquery()
    )
    storage_id = await session.scalar(
        select(StorageRegistry.id).order_by(storage_assignments, StorageRegistry.name).limit(1).with_for_update()
    )
    if storage_id is None:
        raise UnavailableError("No storage registry available")

    return await _persist(
        session,
        name,
        user,
        compute_id=compute_id,
        storage_id=storage_id,
        database_id=database_id,
    )


async def create(
    session: AsyncSession,
    name: str,
    user: User,
    *,
    compute_id: UUID,
    storage_id: UUID,
    database_id: UUID,
) -> Organization:
    """Create an Organization with the specified infrastructure."""

    # Lock every requested registry while validating the immutable infrastructure assignment.
    result = await session.execute(
        select(DatabaseRegistry.id, StorageRegistry.id)
        .select_from(ComputeRegistry)
        .outerjoin(DatabaseRegistry, DatabaseRegistry.id == database_id)
        .outerjoin(StorageRegistry, StorageRegistry.id == storage_id)
        .where(ComputeRegistry.id == compute_id)
        .with_for_update()
    )
    assignment = result.one_or_none()
    if assignment is None:
        raise UnavailableError("No compute registry available")
    database_registry_id, storage_registry_id = assignment
    if database_registry_id is None:
        raise UnavailableError("No database registry available")
    if storage_registry_id is None:
        raise UnavailableError("No storage registry available")


    return await _persist(
        session,
        name,
        user,
        compute_id=compute_id,
        storage_id=storage_id,
        database_id=database_id,
    )


async def _persist(
    session: AsyncSession,
    name: str,
    user: User,
    *,
    compute_id: UUID,
    storage_id: UUID,
    database_id: UUID,
) -> Organization:
    """Persist an Organization after its infrastructure assignment is locked and validated."""

    # Build the Organization with its immutable infrastructure assignments.
    organization = Organization(
        name=name,
        slug=names.slugify(name),
        compute_id=compute_id,
        database_id=database_id,
        storage_id=storage_id,
    )

    # Attach the creator as the initial owner for every organization.
    organization.created_id = user.id
    organization.updated_id = user.id

    # Translate unique conflicts from autoflush without invalidating the caller's transaction.
    try:
        async with session.begin_nested():
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
            await session.flush()
    # Keep Organization uniqueness collisions at the service boundary as an API conflict.
    except IntegrityError as exc:
        raise ConflictError("Organization already exists") from exc

    await operations.enqueue(session, kind=OperationKind.organization_create, target_id=organization.id)
    return organization


async def update(session: AsyncSession, organization_id: UUID, avatar: str, user: User) -> Organization | None:
    """Update mutable Organization metadata."""

    # Lock and update the active Organization row.
    result = await session.scalars(
        select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_(None)).with_for_update()
    )
    organization = result.one_or_none()
    if organization is None:
        return None
    if organization.avatar == avatar:
        return organization
    organization.avatar = avatar
    organization.updated_id = user.id

    return organization


async def soft_delete(session: AsyncSession, organization_id: UUID, user: User) -> Organization | None:
    """Tombstone an Organization and nested state."""

    # Lock the Organization state before tombstoning its nested rows.
    organization = await session.get(Organization, organization_id, with_for_update=True)
    if organization is None:
        return None

    # Record nested tombstones once; repeated requests only ensure cleanup remains queued.
    if organization.deleted_at is None:
        now = utcnow()
        organization.deleted_at = now
        organization.deleted_id = user.id
        organization.updated_at = now
        organization.updated_id = user.id

        # Tombstone every active Application without loading each object.
        await session.execute(
            sql_update(Application)
            .where(
                Application.organization_id == organization_id,
                Application.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )

        # Organization cleanup supersedes unleased Application lifecycle work.
        await session.execute(
            delete(Operation).where(
                Operation.kind.in_((OperationKind.application_create, OperationKind.application_delete)),
                Operation.target_id.in_(select(Application.id).where(Application.organization_id == organization_id)),
                Operation.finished_at.is_(None),
                Operation.lease_expires_at.is_(None),
            )
        )

    # Keep tombstones and Organization cleanup in one transaction.
    await operations.enqueue(session, kind=OperationKind.organization_delete, target_id=organization.id)

    return organization
