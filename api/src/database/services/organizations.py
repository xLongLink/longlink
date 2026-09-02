from uuid import UUID
from datetime import timedelta
from sqlmodel import col
from src.utils import names, roles
from sqlalchemy import func, delete, select
from sqlalchemy import update as sql_update
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from dataclasses import dataclass
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, load_only, joinedload, contains_eager
from collections.abc import Sequence
from longlink.shared import audit as shared_audit
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.adapters.postgres import Postgres
from src.database.services import operations
from src.database.services import invitations as invitation_service
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
        .join(Organization, col(Organization.id) == col(UserOrganization.organization_id))
        .options(contains_eager(UserOrganization.organization))
        .where(
            col(UserOrganization.user_id) == user_id,
            col(UserOrganization.organization_id) == organization_id,
            col(UserOrganization.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
        )
    )
    return await session.scalar(statement)


async def membership_by_slug(session: AsyncSession, user_id: UUID, organization_slug: str) -> UserOrganization | None:
    """Return one user's active membership for an active Organization slug."""

    # Load only the requested Organization membership and its response-ready Organization.
    statement = (
        select(UserOrganization)
        .join(Organization, col(Organization.id) == col(UserOrganization.organization_id))
        .options(contains_eager(UserOrganization.organization))
        .where(
            col(UserOrganization.user_id) == user_id,
            col(Organization.slug) == organization_slug,
            col(UserOrganization.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
        )
    )
    return await session.scalar(statement)


async def application_runtime_access(
    session: AsyncSession, user_id: UUID, application_id: UUID
) -> tuple[Application, OrganizationRoles, ComputeRegistry] | None:
    """Return one user's active application access with its compute registry."""

    # Load Application access and its gateway secret in one query.
    result = await session.execute(
        select(Application, col(UserOrganization.role), ComputeRegistry)
        .options(
            load_only(
                Application.id,
                Application.organization_id,
                Application.secrets,
                Application.status,
            ),
            load_only(
                ComputeRegistry.id,
                ComputeRegistry.kubeconfig,
                ComputeRegistry.gateway_url,
                ComputeRegistry.gateway_certificate,
                ComputeRegistry.gateway_client_identity,
            ),
        )
        .join(Organization, col(Organization.id) == col(Application.organization_id))
        .join(UserOrganization, col(UserOrganization.organization_id) == col(Organization.id))
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        .where(
            col(Application.id) == application_id,
            col(Application.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
            col(UserOrganization.user_id) == user_id,
            col(UserOrganization.deleted_at).is_(None),
        )
    )
    return result.tuples().one_or_none()


async def infrastructure(session: AsyncSession, organization_id: UUID) -> Infrastructure | None:
    """Return one Organization and a consistent snapshot of its infrastructure assignments."""

    result = await session.execute(
        select(Organization, ComputeRegistry, DatabaseRegistry, StorageRegistry)
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        .join(DatabaseRegistry, col(DatabaseRegistry.id) == col(Organization.database_id))
        .join(StorageRegistry, col(StorageRegistry.id) == col(Organization.storage_id))
        .where(col(Organization.id) == organization_id)
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
        .join(Organization, col(Organization.id) == col(Application.organization_id))
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        .join(DatabaseRegistry, col(DatabaseRegistry.id) == col(Organization.database_id))
        .join(StorageRegistry, col(StorageRegistry.id) == col(Organization.storage_id))
        .where(col(Application.id) == application_id)
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
        .where(col(Organization.deleted_at).is_(None))
        .order_by(col(Organization.name), col(Organization.id))
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count only active organizations visible in the listing.
    count_result = await session.execute(select(func.count()).select_from(Organization).where(col(Organization.deleted_at).is_(None)))
    return result.all(), count_result.scalar_one()


async def applications(session: AsyncSession, organization_id: UUID) -> Sequence[Application]:
    """Return applications for one organization."""

    # Query active organization applications in one session.
    statement = (
        select(Application)
        .options(defer(Application.secrets))
        .where(
            col(Application.organization_id) == organization_id,
            col(Application.deleted_at).is_(None),
        )
        .order_by(col(Application.created_at).asc())
    )
    result = await session.scalars(statement)
    return result.all()


async def invitations(session: AsyncSession, organization_id: UUID) -> Sequence[OrganizationInvitation]:
    """Return active email grants for one organization."""

    # Query unexpired organization invitations in one session.
    statement = (
        select(OrganizationInvitation)
        .join(Organization, col(Organization.id) == col(OrganizationInvitation.organization_id))
        .where(
            col(OrganizationInvitation.organization_id) == organization_id,
            col(OrganizationInvitation.created_at) > utcnow() - timedelta(days=7),
            col(Organization.deleted_at).is_(None),
        )
        .order_by(col(OrganizationInvitation.created_at).desc())
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
            col(UserOrganization.organization_id) == organization_id,
            col(UserOrganization.deleted_at).is_(None),
        )
    )

    result = await session.scalars(statement)
    return result.all()


async def sync_users(session: AsyncSession, organization_id: UUID) -> None:
    """Project users into one active, running Organization database."""

    # Load the active running Organization with its assigned database.
    result = await session.execute(
        select(Organization, DatabaseRegistry)
        .join(DatabaseRegistry, col(DatabaseRegistry.id) == col(Organization.database_id))
        .where(
            col(Organization.id) == organization_id,
            col(Organization.deleted_at).is_(None),
            col(Organization.status) == Status.running,
        )
    )
    assigned = result.tuples().one_or_none()
    if assigned is None:
        return
    organization, database = assigned
    db = Postgres(database.host, database.port, database.username, database.password, database.sslmode)

    # Include deleted memberships so the Organization database receives tombstones.
    memberships_statement = (
        select(UserOrganization).options(joinedload(UserOrganization.user)).where(col(UserOrganization.organization_id) == organization.id)
    )
    memberships_result = await session.scalars(memberships_statement)
    memberships = memberships_result.all()

    # Build the shared-schema user snapshot from Platform-authoritative memberships.
    rows: list[Audit] = []
    for membership in memberships:
        # Use the latest tombstone from either the user or the membership row.
        deleted_at = max((value for value in (membership.user.deleted_at, membership.deleted_at) if value is not None), default=None)

        # Tombstone recency must be reflected in the projected update time.
        if deleted_at is not None:
            updated_at = max(membership.user.updated_at, membership.updated_at, deleted_at)
        else:
            updated_at = max(membership.user.updated_at, membership.updated_at)

        rows.append(
            Audit(
                id=membership.user.id,
                name=membership.user.name,
                email=membership.user.email,
                avatar=membership.user.avatar,
                role=membership.role.value,
                created_at=membership.created_at,
                deleted_at=deleted_at,
                updated_at=updated_at,
            )
        )

    # The Platform is authoritative over Organization user projections.
    await shared_audit.sync(db.url(organization.id.hex, search_path="shared").render_as_string(hide_password=False), rows)


async def update_member_role(
    session: AsyncSession,
    organization_id: UUID,
    member_id: UUID,
    role: OrganizationRoles,
    user: User,
) -> bool:
    """Change one active Organization membership role."""

    # Lock the Organization before revalidating the caller's active access.
    organization = await session.get(Organization, organization_id, populate_existing=True, with_for_update=True)
    if organization is None or organization.deleted_at is not None:
        raise ForbiddenError("Access required")
    caller_membership = await session.get(
        UserOrganization,
        (user.id, organization_id),
        populate_existing=True,
        with_for_update=True,
    )
    if caller_membership is None or caller_membership.deleted_at is not None:
        raise ForbiddenError("Access required")
    if not roles.atleast(caller_membership.role, OrganizationRoles.admin):
        raise ForbiddenError("Permission required")

    # Lock the member role after locking the Organization and caller access.
    statement = (
        select(UserOrganization)
        .join(User, col(User.id) == col(UserOrganization.user_id))
        .where(
            col(UserOrganization.organization_id) == organization_id,
            col(UserOrganization.user_id) == member_id,
            col(UserOrganization.deleted_at).is_(None),
            col(User.deleted_at).is_(None),
        )
        .with_for_update()
    )

    # Require an active organization membership.
    result = await session.scalars(statement)
    membership = result.one_or_none()
    if membership is None:
        raise NotFoundError("Organization member not found")

    # Only owners may grant or change owner access.
    if OrganizationRoles.owner in (membership.role, role) and caller_membership.role != OrganizationRoles.owner:
        raise ForbiddenError("Owner management permissions required")

    # Repeated role assignments do not require persistence or reconciliation.
    if membership.role == role:
        return False

    # Protect organizations from losing their last owner.
    if membership.role == OrganizationRoles.owner and role != OrganizationRoles.owner:
        # Reject demotion when this is the only owner.
        owner_statement = (
            select(1)
            .where(
                col(UserOrganization.organization_id) == organization_id,
                col(UserOrganization.role) == OrganizationRoles.owner,
                col(UserOrganization.deleted_at).is_(None),
            )
            .limit(2)
            .with_for_update()
        )
        owner_result = await session.scalars(owner_statement)
        if len(owner_result.all()) <= 1:
            raise ConflictError("Organization must have at least one owner")

    # Persist the role change.
    membership.updated_id = user.id
    membership.role = role

    return True


async def create_default(session: AsyncSession, name: str, user: User) -> Organization:
    """Create an Organization on the least-assigned available infrastructure."""

    # Serialize each creator's quota check and insert to prevent concurrent requests exceeding the beta limit.
    locked_user_id = await session.scalar(
        select(col(User.id)).where(col(User.id) == user.id, col(User.deleted_at).is_(None)).with_for_update()
    )
    if locked_user_id is None:
        raise ForbiddenError("Access required")

    organization_limit_result = await session.execute(
        select(1)
        .where(
            col(Organization.created_id) == user.id,
            col(Organization.deleted_at).is_(None),
        )
        .offset(2)
        .limit(1)
        .with_for_update()
    )
    if organization_limit_result.scalar_one_or_none() is not None:
        raise ConflictError("Organization limit reached during the beta. Contact LongLink to request additional organizations.")

    # Lock the selected Compute until the Organization assignment is committed.
    compute_assignments = (
        select(func.count(col(Organization.id)))
        .where(col(Organization.compute_id) == col(ComputeRegistry.id), col(Organization.deleted_at).is_(None))
        .scalar_subquery()
    )
    compute_id = await session.scalar(
        select(col(ComputeRegistry.id))
        .where(col(ComputeRegistry.status) == Status.running)
        .order_by(compute_assignments, col(ComputeRegistry.name))
        .limit(1)
        .with_for_update()
    )
    if compute_id is None:
        raise UnavailableError("No ready compute registry available")

    # Lock the selected Database until the Organization assignment is committed.
    database_assignments = (
        select(func.count(col(Organization.id)))
        .where(col(Organization.database_id) == col(DatabaseRegistry.id), col(Organization.deleted_at).is_(None))
        .scalar_subquery()
    )
    database_id = await session.scalar(
        select(col(DatabaseRegistry.id)).order_by(database_assignments, col(DatabaseRegistry.name)).limit(1).with_for_update()
    )
    if database_id is None:
        raise UnavailableError("No database registry available")

    # Lock the selected Storage until the Organization assignment is committed.
    storage_assignments = (
        select(func.count(col(Organization.id)))
        .where(col(Organization.storage_id) == col(StorageRegistry.id), col(Organization.deleted_at).is_(None))
        .scalar_subquery()
    )
    storage_id = await session.scalar(
        select(col(StorageRegistry.id)).order_by(storage_assignments, col(StorageRegistry.name)).limit(1).with_for_update()
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
        select(col(DatabaseRegistry.id), col(StorageRegistry.id))
        .select_from(ComputeRegistry)
        .outerjoin(DatabaseRegistry, col(DatabaseRegistry.id) == database_id)
        .outerjoin(StorageRegistry, col(StorageRegistry.id) == storage_id)
        .where(col(ComputeRegistry.id) == compute_id)
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
        select(Organization).where(col(Organization.id) == organization_id, col(Organization.deleted_at).is_(None)).with_for_update()
    )
    organization = result.one_or_none()
    if organization is None:
        return None

    # Revalidate the caller while the Organization is locked to reject revoked administrators.
    membership = await session.get(
        UserOrganization,
        (user.id, organization_id),
        populate_existing=True,
        with_for_update=True,
    )
    if membership is None or membership.deleted_at is not None:
        raise ForbiddenError("Access required")
    if not roles.atleast(membership.role, OrganizationRoles.admin):
        raise ForbiddenError("Permission required")
    if organization.avatar != avatar:
        organization.avatar = avatar
        organization.updated_id = user.id

    return organization


async def create_invitation(
    session: AsyncSession,
    organization_id: UUID,
    email: str,
    role: OrganizationRoles,
    user: User,
) -> None:
    """Authorize and create one Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    organization = await session.get(Organization, organization_id, populate_existing=True, with_for_update=True)
    if organization is None or organization.deleted_at is not None:
        raise ForbiddenError("Access required")
    membership = await session.get(
        UserOrganization,
        (user.id, organization_id),
        populate_existing=True,
        with_for_update=True,
    )
    if membership is None or membership.deleted_at is not None:
        raise ForbiddenError("Access required")
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")
    if not roles.atleast(membership.role, role):
        raise ForbiddenError("Invitation role permissions required")

    # Persist the email grant after the current role and Organization state have been locked.
    await invitation_service.create(session, organization_id, email, role)


async def revoke_invitation(session: AsyncSession, organization_id: UUID, invitation_id: UUID, user: User) -> None:
    """Authorize and revoke one active Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    organization = await session.get(Organization, organization_id, populate_existing=True, with_for_update=True)
    if organization is None or organization.deleted_at is not None:
        raise ForbiddenError("Access required")
    membership = await session.get(
        UserOrganization,
        (user.id, organization_id),
        populate_existing=True,
        with_for_update=True,
    )
    if membership is None or membership.deleted_at is not None:
        raise ForbiddenError("Access required")
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Resolve only an invitation belonging to the locked Organization.
    invitation = await session.get(OrganizationInvitation, invitation_id, with_for_update=True)
    if invitation is None or invitation.organization_id != organization_id:
        raise NotFoundError("Invitation not found")
    if not roles.atleast(membership.role, invitation.role):
        raise ForbiddenError("Invitation role permissions required")

    await session.delete(invitation)


async def soft_delete(session: AsyncSession, organization_id: UUID, user: User) -> Organization | None:
    """Tombstone an Organization and nested state."""

    # Lock the Organization state before tombstoning its nested rows.
    organization = await session.get(Organization, organization_id, with_for_update=True)
    if organization is None:
        if user.administrator:
            return None
        raise ForbiddenError("Access required")

    # Revalidate active owners while the Organization is locked; only the original actor may retry a tombstone.
    if organization.deleted_at is None and not user.administrator:
        membership = await session.get(UserOrganization, (user.id, organization_id), with_for_update=True)
        if membership is None or membership.deleted_at is not None:
            raise ForbiddenError("Access required")
        if not roles.atleast(membership.role, OrganizationRoles.owner):
            raise ForbiddenError("Permission required")
    elif organization.deleted_at is not None and not user.administrator and organization.deleted_id != user.id:
        raise ForbiddenError("Access required")

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
                col(Application.organization_id) == organization_id,
                col(Application.deleted_at).is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )

        # Organization cleanup supersedes unleased Application lifecycle work.
        await session.execute(
            delete(Operation).where(
                col(Operation.kind).in_((OperationKind.application_create, OperationKind.application_delete)),
                col(Operation.target_id).in_(select(col(Application.id)).where(col(Application.organization_id) == organization_id)),
                col(Operation.finished_at).is_(None),
                col(Operation.lease_expires_at).is_(None),
            )
        )

    # Keep tombstones and Organization cleanup in one transaction.
    await operations.enqueue(session, kind=OperationKind.organization_delete, target_id=organization.id)

    return organization
