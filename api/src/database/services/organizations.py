from uuid import UUID
from datetime import timedelta
from sqlmodel import col
from src.utils import names, roles, postgres
from sqlalchemy import Select, BigInteger, cast, func, delete, select
from sqlalchemy import update as sql_update
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from dataclasses import dataclass
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, load_only, raiseload, joinedload, contains_eager
from collections.abc import Sequence
from longlink.shared import audit as shared_audit
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.services import operations
from src.database.services import invitations as invitation_service
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.operations import Operation
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


@dataclass(frozen=True, slots=True)
class Infrastructure:
    """Hold one Organization and its assigned infrastructure registries."""

    organization: Organization
    compute: ComputeRegistry


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


async def solution_runtime_access(
    session: AsyncSession, user_id: UUID, solution_id: UUID
) -> tuple[Solution, OrganizationRoles, ComputeRegistry] | None:
    """Return one user's active solution access with its compute registry."""

    # Load Solution access and its gateway secret in one query.
    result = await session.execute(
        select(Solution, col(UserOrganization.role), ComputeRegistry)
        .execution_options(populate_existing=True)
        .options(
            raiseload(Solution.desired_revision),
            load_only(
                Solution.id,
                Solution.organization_id,
                Solution.secrets,
                Solution.status,
            ),
            load_only(
                ComputeRegistry.id,
                ComputeRegistry.kubeconfig,
                ComputeRegistry.gateway_url,
                ComputeRegistry.gateway_certificate,
            ),
        )
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .join(UserOrganization, col(UserOrganization.organization_id) == col(Organization.id))
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        .where(
            col(Solution.id) == solution_id,
            col(Solution.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
            col(UserOrganization.user_id) == user_id,
            col(UserOrganization.deleted_at).is_(None),
        )
    )
    return result.tuples().one_or_none()


def _infrastructure_query() -> Select[tuple[Organization, ComputeRegistry]]:
    """Select one Organization's provider connections for lifecycle work."""

    # Keep provider projections and assignment joins shared across lifecycle targets.
    return (
        select(Organization, ComputeRegistry)
        .options(
            load_only(
                ComputeRegistry.id,
                ComputeRegistry.kubeconfig,
                ComputeRegistry.database_size_gib,
                ComputeRegistry.database_instances,
                ComputeRegistry.database_storage_class,
                ComputeRegistry.storage_endpoint,
                ComputeRegistry.storage_certificate,
                ComputeRegistry.bucket_size_bytes,
                ComputeRegistry.bucket_max_objects,
            ),
        )
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
    )


async def infrastructure(session: AsyncSession, organization_id: UUID) -> Infrastructure | None:
    """Return one Organization and a consistent snapshot of its infrastructure assignments."""

    # Load only the Organization lifecycle fields and provider connections consumed by reconciliation.
    statement = _infrastructure_query().where(col(Organization.id) == organization_id)
    result = await session.execute(statement)
    row = result.tuples().one_or_none()
    if row is None:
        return None
    organization, compute = row
    return Infrastructure(organization=organization, compute=compute)


async def solution_infrastructure(session: AsyncSession, solution_id: UUID) -> tuple[Solution, Infrastructure] | None:
    """Return one Solution and its assigned infrastructure."""

    # Load the Solution and its infrastructure in one lifecycle query.
    statement = (
        _infrastructure_query()
        .add_columns(Solution)
        .join_from(Organization, Solution, col(Solution.organization_id) == col(Organization.id))
        .options(
            load_only(
                Solution.id,
                Solution.desired_revision_id,
                Solution.deployed_revision_id,
                Solution.secrets,
                Solution.status,
                Solution.deleted_at,
            ),
        )
        .where(col(Solution.id) == solution_id)
    )
    result = await session.execute(statement)
    row = result.tuples().one_or_none()
    if row is None:
        return None
    organization, compute, solution = row
    return solution, Infrastructure(organization=organization, compute=compute)


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


async def solutions(session: AsyncSession, organization_id: UUID) -> Sequence[Solution]:
    """Return solutions for one organization."""

    # Query active organization solutions in one session.
    statement = (
        select(Solution)
        .options(defer(Solution.secrets))
        .where(
            col(Solution.organization_id) == organization_id,
            col(Solution.deleted_at).is_(None),
        )
        .order_by(col(Solution.created_at))
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

    # Load memberships with the user identity fields required by API payloads.
    statement = (
        select(UserOrganization)
        .options(joinedload(UserOrganization.user).load_only(User.id, User.name, User.email, User.avatar))
        .where(
            col(UserOrganization.organization_id) == organization_id,
            col(UserOrganization.deleted_at).is_(None),
        )
    )

    result = await session.scalars(statement)
    return result.all()


async def sync_users(session: AsyncSession, organization_id: UUID) -> None:
    """Durably request shared-user projection in the caller's transaction."""

    # Never wake a sleeping database for a membership mutation.
    await session.execute(sql_update(Organization).where(col(Organization.id) == organization_id).values(database_sync_pending=True))


async def project_users(session: AsyncSession, organization_id: UUID, db: postgres.Postgres) -> None:
    """Project a Platform snapshot while runtime coordination owns synchronization."""

    # Include deleted memberships so the Organization database receives tombstones.
    memberships_statement = (
        select(UserOrganization)
        .options(joinedload(UserOrganization.user).load_only(User.id, User.name, User.email, User.avatar, User.updated_at, User.deleted_at))
        .where(col(UserOrganization.organization_id) == organization_id)
    )
    memberships_result = await session.scalars(memberships_statement)

    # Build the shared-schema user snapshot from Platform-authoritative memberships.
    rows: list[Audit] = []
    for membership in memberships_result:
        # Use the latest tombstone from either the user or the membership row.
        deleted_at = max((value for value in (membership.user.deleted_at, membership.deleted_at) if value is not None), default=None)

        # Tombstone recency must be reflected in the projected update time.
        updated_at = max(value for value in (membership.user.updated_at, membership.updated_at, deleted_at) if value is not None)

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

    # Empty snapshots must not open an Organization database connection.
    if not rows:
        return

    # The Platform owns the transaction for its authoritative Organization user projection.
    async with db._connection(organization_id.hex, search_path="shared") as conn:
        await shared_audit.sync(conn, rows)


async def _locked_membership(
    session: AsyncSession, user_id: UUID, organization_id: UUID, minimum_role: OrganizationRoles
) -> UserOrganization:
    """Refresh and authorize a membership after the caller has locked its Organization."""

    # Lock and refresh caller access so previously loaded memberships cannot authorize revoked users.
    membership = await session.get(
        UserOrganization,
        (user_id, organization_id),
        populate_existing=True,
        with_for_update=True,
    )
    if membership is None or membership.deleted_at is not None:
        raise ForbiddenError("Access required")
    if not roles.atleast(membership.role, minimum_role):
        raise ForbiddenError("Permission required")
    return membership


async def update_member_role(
    session: AsyncSession,
    organization_id: UUID,
    member_id: UUID,
    role: OrganizationRoles,
    user_id: UUID,
) -> None:
    """Change one active Organization membership role."""

    # Lock the Organization before revalidating the caller's active access.
    organization = await session.get(Organization, organization_id, populate_existing=True, with_for_update=True)
    if organization is None or organization.deleted_at is not None:
        raise ForbiddenError("Access required")
    caller_membership = await _locked_membership(session, user_id, organization_id, OrganizationRoles.admin)

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
        return

    # Protect organizations from losing their last owner.
    if membership.role == OrganizationRoles.owner:
        # Reject demotion when no other active owner remains.
        other_owner_id = await session.scalar(
            select(col(UserOrganization.user_id))
            .where(
                col(UserOrganization.organization_id) == organization_id,
                col(UserOrganization.role) == OrganizationRoles.owner,
                col(UserOrganization.deleted_at).is_(None),
                col(UserOrganization.user_id) != member_id,
            )
            .limit(1)
            .with_for_update()
        )
        if other_owner_id is None:
            raise ConflictError("Organization must have at least one owner")

    # Persist the role change.
    membership.updated_id = user_id
    membership.role = role
    await sync_users(session, organization_id)


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
        select(func.count(col(Organization.id))).where(col(Organization.compute_id) == col(ComputeRegistry.id)).scalar_subquery()
    )
    compute_id = await session.scalar(
        select(col(ComputeRegistry.id))
        .where(
            col(ComputeRegistry.status) == Status.running,
            compute_assignments + 1
            <= (
                cast(col(ComputeRegistry.storage_size_gib), BigInteger)
                * 1024**3
                * (100 - col(ComputeRegistry.storage_reserve_percent))
                / 100
            )
            / (
                col(ComputeRegistry.bucket_size_bytes)
                + cast(col(ComputeRegistry.bucket_max_objects), BigInteger) * col(ComputeRegistry.storage_object_overhead_bytes)
            ),
        )
        .order_by(compute_assignments, col(ComputeRegistry.name))
        .limit(1)
        .with_for_update()
    )
    if compute_id is None:
        raise UnavailableError("No ready compute registry available")

    return await create(
        session,
        name,
        user,
        compute_id=compute_id,
    )


async def create(
    session: AsyncSession,
    name: str,
    user: User,
    *,
    compute_id: UUID,
) -> Organization:
    """Create an Organization with the specified infrastructure."""

    # A no-op write serializes admission on every supported backend, including SQLite.
    await session.execute(sql_update(ComputeRegistry).where(col(ComputeRegistry.id) == compute_id).values(name=col(ComputeRegistry.name)))
    compute = await session.get(ComputeRegistry, compute_id, populate_existing=True)
    if compute is None:
        raise UnavailableError("No compute registry available")

    # Recount after acquiring the Compute lock: pre-lock selection may have a stale statement snapshot.
    count_result = await session.execute(select(func.count()).select_from(Organization).where(col(Organization.compute_id) == compute_id))
    count = count_result.scalar_one()
    reservation = compute.bucket_size_bytes + compute.bucket_max_objects * compute.storage_object_overhead_bytes

    # OSD count equals pool replication, so usable capacity is one OSD, not their raw sum.
    capacity = compute.storage_size_gib * 1024**3 * (100 - compute.storage_reserve_percent) // 100
    if (count + 1) * reservation > capacity:
        raise UnavailableError("Compute storage capacity is reserved; wait for cleanup or register more capacity")

    # Build the Organization with its immutable infrastructure assignments.
    organization = Organization(
        name=name,
        slug=names.slugify(name),
        compute_id=compute_id,
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


async def update(
    session: AsyncSession, organization_id: UUID, avatar: str | None, user_id: UUID, database_idle_seconds: int | None = None
) -> Organization | None:
    """Update mutable Organization metadata."""

    # Take a portable write lock before refreshing metadata already loaded by authentication.
    await session.execute(
        sql_update(Organization).where(col(Organization.id) == organization_id).values(updated_at=col(Organization.updated_at))
    )
    organization = await session.get(Organization, organization_id, populate_existing=True)
    if organization is None or organization.deleted_at is not None:
        return None

    # Revalidate the caller while the Organization is locked to reject revoked administrators.
    await _locked_membership(session, user_id, organization_id, OrganizationRoles.admin)
    if avatar is not None and organization.avatar != avatar:
        organization.avatar = avatar
        organization.updated_id = user_id
    if database_idle_seconds is not None and organization.database_idle_seconds != database_idle_seconds:
        organization.database_idle_seconds = database_idle_seconds
        organization.updated_id = user_id

    return organization


async def create_invitation(
    session: AsyncSession,
    organization_id: UUID,
    email: str,
    role: OrganizationRoles,
    user_id: UUID,
) -> None:
    """Authorize and create one Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    organization = await session.get(Organization, organization_id, populate_existing=True, with_for_update=True)
    if organization is None or organization.deleted_at is not None:
        raise ForbiddenError("Access required")
    membership = await _locked_membership(session, user_id, organization_id, OrganizationRoles.maintain)
    if not roles.atleast(membership.role, role):
        raise ForbiddenError("Invitation role permissions required")

    # Persist the email grant after the current role and Organization state have been locked.
    await invitation_service.create(session, organization_id, email, role)


async def revoke_invitation(session: AsyncSession, organization_id: UUID, invitation_id: UUID, user_id: UUID) -> None:
    """Authorize and revoke one active Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    organization = await session.get(Organization, organization_id, populate_existing=True, with_for_update=True)
    if organization is None or organization.deleted_at is not None:
        raise ForbiddenError("Access required")
    membership = await _locked_membership(session, user_id, organization_id, OrganizationRoles.maintain)

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
    elif not user.administrator and organization.deleted_id != user.id:
        raise ForbiddenError("Access required")

    # Record nested tombstones once; repeated requests only ensure cleanup remains queued.
    if organization.deleted_at is None:
        now = utcnow()
        organization.deleted_at = now
        organization.deleted_id = user.id
        organization.updated_at = now
        organization.updated_id = user.id

        # Tombstone every active Solution without loading each object.
        await session.execute(
            sql_update(Solution)
            .where(
                col(Solution.organization_id) == organization_id,
                col(Solution.deleted_at).is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )

        # Organization cleanup supersedes unleased Solution lifecycle work.
        await session.execute(
            delete(Operation).where(
                col(Operation.kind) == OperationKind.solution_delete,
                col(Operation.target_id).in_(select(col(Solution.id)).where(col(Solution.organization_id) == organization_id)),
                col(Operation.finished_at).is_(None),
                col(Operation.lease_expires_at).is_(None),
            )
        )

    # Keep tombstones and Organization cleanup in one transaction.
    await operations.enqueue(session, kind=OperationKind.organization_delete, target_id=organization.id)

    return organization
