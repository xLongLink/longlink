from uuid import UUID
from sqlalchemy import delete, select
from sqlalchemy import update as sql_update
from src.errors import ConflictError, ForbiddenError, UnavailableError
from dataclasses import dataclass
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, contains_eager
from collections.abc import Sequence
from longlink.shared import audit as shared_audit
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.adapters.postgres import Postgres
from src.database.services import operations
from src.models.operations import OperationKind
from longlink.shared.models import AuditUser
from sqlalchemy.ext.asyncio import AsyncSession
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
    result = await session.execute(statement)
    return result.scalar_one_or_none()


async def application_access(
    session: AsyncSession, user_id: UUID, application_id: UUID
) -> tuple[Application, Organization, OrganizationRoles] | None:
    """Return one user's active access to one active Application."""

    # Resolve the requested Application and its active Organization membership in one scoped query.
    result = await session.execute(
        select(Application, Organization, UserOrganization.role)
        .join(Organization, Organization.id == Application.organization_id)
        .join(UserOrganization, UserOrganization.organization_id == Organization.id)
        .where(
            Application.id == application_id,
            Application.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
            UserOrganization.user_id == user_id,
            UserOrganization.deleted_at.is_(None),
        )
    )
    row = result.one_or_none()
    if row is None:
        return None
    application, organization, role = row
    return application, organization, role


async def infrastructure(session: AsyncSession, organization_id: UUID) -> Infrastructure | None:
    """Return one Organization and a consistent snapshot of its infrastructure assignments."""

    statement = (
        select(Organization, ComputeRegistry, DatabaseRegistry, StorageRegistry)
        .join(ComputeRegistry, ComputeRegistry.id == Organization.compute_id)
        .join(DatabaseRegistry, DatabaseRegistry.id == Organization.database_id)
        .join(StorageRegistry, StorageRegistry.id == Organization.storage_id)
        .where(Organization.id == organization_id)
    )
    result = await session.execute(statement)
    row = result.tuples().one_or_none()
    if row is None:
        return None
    organization, compute, database, storage = row
    return Infrastructure(organization=organization, compute=compute, database=database, storage=storage)


async def fetch(session: AsyncSession) -> Sequence[Organization]:
    """Return all organizations in the database."""

    # Load active organizations.
    statement = select(Organization).where(Organization.deleted_at.is_(None))
    result = await session.scalars(statement)
    return result.all()


async def set_runtime(session: AsyncSession, organization_id: UUID, expected_status: Status, status: Status) -> None:
    """Transition one active Organization from the expected lifecycle state."""

    # Guard lifecycle writes from stale attempts after deletion or another transition.
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
        return


async def purge(session: AsyncSession, organization_id: UUID) -> None:
    """Hard-delete one organization after all applications and external resources are gone."""

    # The organization tombstone remains until every child application has been purged.
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


async def applications(session: AsyncSession, organization_id: UUID, include_deleted: bool = False) -> Sequence[Application]:
    """Return applications for one organization."""

    # Query organization applications in one session.
    statement = select(Application).where(Application.organization_id == organization_id)

    # Include deleted rows only when requested.
    if not include_deleted:
        statement = statement.where(Application.deleted_at.is_(None))

    statement = statement.order_by(Application.created_at.asc())
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


async def get(session: AsyncSession, organization_id: UUID, include_deleted: bool = False) -> Organization | None:
    """Return one organization by id with related rows loaded."""

    # Load organization details through one managed session.
    statement = select(Organization).where(Organization.id == organization_id)

    # Exclude deleted organizations unless requested.
    if not include_deleted:
        statement = statement.where(Organization.deleted_at.is_(None))

    result = await session.scalars(statement)
    return result.one_or_none()


async def members(session: AsyncSession, organization_id: UUID, include_deleted: bool = False) -> Sequence[UserOrganization]:
    """Return organization member rows for one organization."""

    # Query memberships with their users so detached callers can shape API payloads.
    statement = (
        select(UserOrganization).options(joinedload(UserOrganization.user)).where(UserOrganization.organization_id == organization_id)
    )

    # Include deleted memberships only when requested by control-plane orchestration.
    if not include_deleted:
        statement = statement.where(UserOrganization.deleted_at.is_(None))

    result = await session.scalars(statement)
    return result.all()


async def sync_users(session: AsyncSession, organization_id: UUID, db: Postgres | None = None) -> None:
    """Project Platform-owned users and memberships into one Organization database."""

    # Ignore removed Organizations that no longer own a shared database projection.
    assigned = await infrastructure(session, organization_id)
    if assigned is None or assigned.organization.deleted_at is not None:
        return
    if assigned.organization.status != Status.running and db is None:
        return

    # Build the shared-schema user snapshot from Platform-authoritative memberships.
    memberships = await members(session, organization_id, include_deleted=True)
    rows: list[AuditUser] = []
    for membership in memberships:
        user = membership.user
        deleted_at = max((item for item in (user.deleted_at, membership.deleted_at) if item is not None), default=None)
        updated_at = max(user.updated_at, membership.updated_at, deleted_at or user.updated_at)
        rows.append(
            AuditUser(
                id=user.id,
                name=user.name,
                email=user.email,
                avatar=user.avatar,
                role=membership.role.value,
                created_at=membership.created_at,
                updated_at=updated_at,
                deleted_at=deleted_at,
            )
        )

    # The Platform is authoritative; reuse the prepared client during Organization creation.
    if db is None:
        database = assigned.database
        db = Postgres(database.host, database.port, database.username, database.password, database.sslmode)
    await shared_audit.sync(db.url(organization_id.hex, search_path="shared").render_as_string(hide_password=False), rows)


async def update_member_role(
    session: AsyncSession,
    organization_id: UUID,
    member_id: UUID,
    role: OrganizationRoles,
    user: User,
    caller_role: OrganizationRoles,
) -> bool:
    """Change one active Organization membership and synchronize its user projection."""

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
        return False

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
        result = await session.scalars(owner_statement)
        owner_ids = result.all()
        if len(owner_ids) <= 1:
            raise ConflictError("Organization must have at least one owner")

    # Persist the role change.
    membership.updated_id = user.id
    membership.role = role

    # Project the membership change into the Organization database.
    await sync_users(session, organization_id)
    return True


async def create(
    session: AsyncSession,
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

    # Lock the requested running compute registry.
    compute_statement = select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update()
    result = await session.scalars(compute_statement)
    compute = result.one_or_none()
    if compute is None:
        raise UnavailableError("No compute registry available")
    if compute.status != Status.running:
        raise UnavailableError("No ready compute registry available")

    # Lock the requested database registry.
    database_statement = select(DatabaseRegistry.id).where(DatabaseRegistry.id == database_id).with_for_update()
    if await session.scalar(database_statement) is None:
        raise UnavailableError("No database registry available")

    # Lock the requested storage registry.
    storage_statement = select(StorageRegistry.id).where(StorageRegistry.id == storage_id).with_for_update()
    if await session.scalar(storage_statement) is None:
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

    await operations.enqueue(session, organization.compute_id, kind=OperationKind.organization_create, target_id=organization.id)
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

    # Keep tombstones and Organization cleanup in one transaction.
    await operations.enqueue(session, organization.compute_id, kind=OperationKind.organization_delete, target_id=organization.id)

    return organization
