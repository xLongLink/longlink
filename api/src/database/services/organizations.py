from uuid import UUID
from typing import cast
from fastapi import HTTPException
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from src.utils import names, roles
from sqlalchemy import Select, or_, func, delete, select
from sqlalchemy import update as sql_update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import load_only, joinedload, selectinload, contains_eager
from collections.abc import Sequence
from src.models.tags import TagIcon, TagKind
from src.models.roles import OrganizationRoles
from sqlalchemy.engine import CursorResult
from src.database.types import attr
from src.models.pricing import FREE_USERS
from src.database.services import operations
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.tags import OrganizationTag
from src.models.organizations import OrganizationInvitationCreate
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


def _membership_query(user_id: UUID) -> Select[UserOrganization]:
    """Select one user's active membership with its response-ready Organization."""

    return (
        select(UserOrganization)
        .join(Organization, col(Organization.id) == col(UserOrganization.organization_id))
        .options(
            contains_eager(attr(UserOrganization.organization)).load_only(
                attr(Organization.id),
                attr(Organization.name),
                attr(Organization.slug),
                # Include lifecycle and quota data without decrypting infrastructure credentials.
                attr(Organization.status),
                attr(Organization.storage_quota_bytes),
            )
        )
        .where(col(UserOrganization.user_id) == user_id, col(Organization.deleted_at).is_(None))
    )


async def require_membership(
    session: AsyncSession, user_id: UUID, organization_id: UUID, minimum_role: OrganizationRoles = OrganizationRoles.read
) -> UserOrganization:
    """Require active Organization access with the requested minimum role without taking command locks."""

    # Resolve active access before checking its minimum required role.
    statement = _membership_query(user_id).where(col(UserOrganization.organization_id) == organization_id)
    access = await session.scalar(statement)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    if not roles.atleast(access.role, minimum_role):
        raise HTTPException(status_code=403, detail="Permission required")
    return access


async def membership_by_slug(session: AsyncSession, user_id: UUID, organization_slug: str) -> UserOrganization:
    """Return one user's active membership for an active Organization slug."""

    # Load only the requested Organization membership and its response-ready Organization.
    statement = _membership_query(user_id).where(col(Organization.slug) == organization_slug)
    membership = await session.scalar(statement)
    if membership is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return membership


async def memberships(session: AsyncSession, user_id: UUID) -> Sequence[UserOrganization]:
    """Return one user's active memberships with response-ready Organizations."""

    # Reuse the active membership query shared by identifier and slug access.
    result = await session.scalars(_membership_query(user_id))
    return result.all()


async def solution_runtime_access(
    session: AsyncSession, user_id: UUID, solution_id: UUID
) -> tuple[Solution, OrganizationRoles, ComputeRegistry]:
    """Return one user's active Solution access with its gateway connection."""

    # Load Solution access and its gateway secret in one query.
    result = await session.execute(
        select(Solution, col(UserOrganization.role), ComputeRegistry)
        .execution_options(populate_existing=True)
        .options(
            load_only(attr(Solution.id), attr(Solution.organization_id), attr(Solution.secrets), attr(Solution.status)),
            load_only(attr(ComputeRegistry.id), attr(ComputeRegistry.gateway_url), attr(ComputeRegistry.gateway_certificate)),
        )
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .join(UserOrganization, col(UserOrganization.organization_id) == col(Organization.id))
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        # Require active tenant resources and the caller's membership.
        .where(
            col(Solution.id) == solution_id,
            col(Solution.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
            # Scope the access query to the authenticated user.
            col(UserOrganization.user_id) == user_id,
        )
    )
    access = result.one_or_none()
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    return access


async def solution_logs_access(
    session: AsyncSession, user_id: UUID, solution_id: UUID
) -> tuple[UUID, OrganizationRoles, dict[str, object]]:
    """Return active Solution log access without loading runtime or gateway credentials."""

    # Resolve the Organization, current membership role, and cluster connection in one query.
    result = await session.execute(
        select(col(Solution.organization_id), col(UserOrganization.role), col(ComputeRegistry.kubeconfig))
        .select_from(Solution)
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .join(UserOrganization, col(UserOrganization.organization_id) == col(Organization.id))
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        .where(
            col(Solution.id) == solution_id,
            col(Solution.deleted_at).is_(None),
            # Access requires an active parent and the caller's membership.
            col(Organization.deleted_at).is_(None),
            col(UserOrganization.user_id) == user_id,
        )
    )
    access = result.one_or_none()
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    return access


async def storage_infrastructure(session: AsyncSession, organization_id: UUID) -> ComputeRegistry:
    """Return one Organization's assigned storage connection without lifecycle credentials."""

    # Load only the Compute fields needed to inspect the Organization bucket.
    compute = await session.scalar(
        select(ComputeRegistry)
        .options(
            load_only(
                attr(ComputeRegistry.id),
                attr(ComputeRegistry.storage_endpoint),
                attr(ComputeRegistry.storage_access_key),
                attr(ComputeRegistry.storage_secret_key),
                # Retain the storage endpoint's trust material with its credentials.
                attr(ComputeRegistry.storage_certificate),
            )
        )
        .join(Organization, col(Organization.compute_id) == col(ComputeRegistry.id))
        # Resolve infrastructure only through the owning Organization.
        .where(col(Organization.id) == organization_id)
    )
    if compute is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return compute


async def database_infrastructure(session: AsyncSession, organization_id: UUID) -> tuple[Organization, ComputeRegistry]:
    """Return only the credentials and capacity needed to inspect one Organization database."""

    # Keep storage and gateway secrets outside the database usage read.
    result = await session.execute(
        select(Organization, ComputeRegistry)
        .options(
            load_only(
                attr(Organization.id),
                attr(Organization.database_state),
                attr(Organization.database_password),
                attr(Organization.database_size_mib),
            ),
            # Database provisioning needs cluster access, not storage credentials.
            load_only(attr(ComputeRegistry.kubeconfig)),
        )
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        .where(col(Organization.id) == organization_id, col(Organization.deleted_at).is_(None))
    )
    target = result.one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return target


def _infrastructure_query() -> Select[Organization, ComputeRegistry]:
    """Select one Organization's provider connections for lifecycle work."""

    # Keep provider projections and assignment joins shared across lifecycle targets.
    return (
        select(Organization, ComputeRegistry)
        .options(
            load_only(
                attr(ComputeRegistry.id),
                attr(ComputeRegistry.kubeconfig),
                # Provisioning owns both database placement and object storage setup.
                attr(ComputeRegistry.database_storage_class),
                attr(ComputeRegistry.storage_endpoint),
                attr(ComputeRegistry.storage_access_key),
                attr(ComputeRegistry.storage_secret_key),
                attr(ComputeRegistry.storage_certificate),
            )
        )
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
    )


async def infrastructure(session: AsyncSession, organization_id: UUID) -> tuple[Organization, ComputeRegistry] | None:
    """Return one Organization and a consistent snapshot of its infrastructure assignments."""

    # Load only the Organization lifecycle fields and provider connections consumed by reconciliation.
    statement = _infrastructure_query().where(col(Organization.id) == organization_id)
    result = await session.execute(statement)
    return result.one_or_none()


async def solution_cleanup_infrastructure(session: AsyncSession, solution_id: UUID) -> tuple[Organization, ComputeRegistry] | None:
    """Return provider connections for cleanup without loading Solution release state."""

    # Include tombstones while leaving secrets and revision snapshots outside the cleanup projection.
    statement = (
        _infrastructure_query()
        .join_from(Organization, Solution, col(Solution.organization_id) == col(Organization.id))
        .where(col(Solution.id) == solution_id)
    )
    result = await session.execute(statement)
    return result.one_or_none()


async def solution_infrastructure(session: AsyncSession, solution_id: UUID) -> tuple[Solution, Organization, ComputeRegistry] | None:
    """Return one Solution and its assigned infrastructure."""

    # Load infrastructure and the failure state needed to select the effective release, not its environments.
    statement = (
        _infrastructure_query()
        .with_only_columns(Solution, Organization, ComputeRegistry)
        .join_from(Organization, Solution, col(Solution.organization_id) == col(Organization.id))
        .options(
            load_only(
                attr(Solution.id),
                attr(Solution.desired_revision_id),
                attr(Solution.deployed_revision_id),
                attr(Solution.secrets),
                # Deployment needs lifecycle state alongside the captured revision pointers.
                attr(Solution.status),
                attr(Solution.deleted_at),
            ),
            selectinload(attr(Solution.desired_revision)).load_only(attr(Revision.failed), raiseload=True),
        )
        .where(col(Solution.id) == solution_id)
    )
    result = await session.execute(statement)
    return result.one_or_none()


async def fetch(session: AsyncSession, pagination: Pagination, search: str = "") -> tuple[Sequence[Organization], int]:
    """Return one newest-first page of active organizations for administrator views."""

    # Match literal names and slugs while retaining active Organization visibility.
    query = select(Organization).where(col(Organization.deleted_at).is_(None))
    if search:
        query = query.where(
            or_(col(Organization.name).icontains(search, autoescape=True), col(Organization.slug).icontains(search, autoescape=True))
        )

    # Load only Organization identity fields using a stable page order.
    statement = (
        query.options(load_only(attr(Organization.id), attr(Organization.name), attr(Organization.slug), attr(Organization.status)))
        .order_by(col(Organization.created_at).desc(), col(Organization.id).desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count matches before pagination using the same visibility and search filters.
    count_result = await session.execute(select(func.count()).select_from(query.subquery()))
    return result.all(), count_result.scalar_one()


async def solutions(session: AsyncSession, organization_id: UUID) -> Sequence[Solution]:
    """Return solutions for one organization."""

    # Load active Solution summaries and pending deployment state without decrypting environments or secrets.
    statement = (
        select(Solution)
        .options(
            load_only(
                attr(Solution.id),
                attr(Solution.name),
                attr(Solution.slug),
                attr(Solution.description),
                attr(Solution.status),
                attr(Solution.desired_revision_id),
                # Preserve both desired and observed release identities.
                attr(Solution.deployed_revision_id),
            ),
            selectinload(attr(Solution.desired_revision)).load_only(attr(Revision.failed), raiseload=True),
            selectinload(attr(Solution.deployed_revision)).load_only(attr(Revision.version), raiseload=True),
            selectinload(attr(Solution.tag_assignments)),
        )
        .where(col(Solution.organization_id) == organization_id, col(Solution.deleted_at).is_(None))
        .order_by(col(Solution.created_at))
    )

    # Consume the read-only query within its owning session.
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
            col(OrganizationInvitation.created_at) > datetime.now(UTC) - timedelta(days=7),
            col(Organization.deleted_at).is_(None),
        )
        # Show the newest invitations first.
        .order_by(col(OrganizationInvitation.created_at).desc())
    )
    result = await session.scalars(statement)
    return result.all()


async def members(session: AsyncSession, organization_id: UUID) -> Sequence[UserOrganization]:
    """Return active organization member rows for one organization."""

    # Load memberships with the user identity fields required by API payloads.
    statement = (
        select(UserOrganization)
        .options(joinedload(attr(UserOrganization.user)).load_only(attr(User.id), attr(User.name), attr(User.email), attr(User.avatar)))
        .where(col(UserOrganization.organization_id) == organization_id)
    )

    result = await session.scalars(statement)
    return result.all()


async def member_count(session: AsyncSession, organization_id: UUID) -> int:
    """Count accepted active members, excluding invitations and deleted users."""

    result = await session.execute(
        select(func.count())
        .select_from(UserOrganization)
        .join(User, col(User.id) == col(UserOrganization.user_id))
        .where(col(UserOrganization.organization_id) == organization_id, col(User.deleted_at).is_(None))
    )
    return result.scalar_one()


async def lock(session: AsyncSession, organization_id: UUID) -> Organization:
    """Serialize organization commands and membership admission on every supported database."""

    # A no-op write also takes a lock on SQLite, where FOR UPDATE is ignored.
    await session.execute(
        sql_update(Organization).where(col(Organization.id) == organization_id).values(updated_at=col(Organization.updated_at))
    )
    organization = await session.get(Organization, organization_id, populate_existing=True)
    if organization is None:
        raise HTTPException(status_code=403, detail="Organization unavailable")
    return organization


async def locked_membership(
    session: AsyncSession, user_id: UUID, organization_id: UUID, minimum_role: OrganizationRoles
) -> UserOrganization:
    """Refresh and authorize a membership after the caller has locked its Organization."""

    # Lock and refresh caller access so previously loaded memberships cannot authorize revoked users.
    membership = await session.get(UserOrganization, (user_id, organization_id), populate_existing=True, with_for_update=True)
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")
    if not roles.atleast(membership.role, minimum_role):
        raise HTTPException(status_code=403, detail="Permission required")
    return membership


async def lock_active_access(
    session: AsyncSession, user_id: UUID, organization_id: UUID, minimum_role: OrganizationRoles
) -> tuple[Organization, UserOrganization]:
    """Reserve an Organization command write before authorizing active caller access."""

    # Refresh active Organization state under the write lock before checking membership.
    organization = await lock(session, organization_id)
    if organization.deleted_at is not None:
        raise HTTPException(status_code=403, detail="Access required")
    membership = await locked_membership(session, user_id, organization_id, minimum_role)
    return organization, membership


async def update_member_role(session: AsyncSession, organization_id: UUID, member_id: UUID, role: OrganizationRoles, user_id: UUID) -> None:
    """Change one active Organization membership role."""

    # Lock the Organization before revalidating the caller's active access.
    _, caller_membership = await lock_active_access(session, user_id, organization_id, OrganizationRoles.admin)

    # Lock the member role after locking the Organization and caller access.
    statement = (
        select(UserOrganization)
        .join(User, col(User.id) == col(UserOrganization.user_id))
        .where(
            col(UserOrganization.organization_id) == organization_id,
            col(UserOrganization.user_id) == member_id,
            col(User.deleted_at).is_(None),
        )
        .with_for_update()
    )

    # Require an active organization membership.
    result = await session.scalars(statement)
    membership = result.one_or_none()
    if membership is None:
        raise HTTPException(status_code=404, detail="Organization member not found")

    # Only owners may grant or change owner access.
    if OrganizationRoles.owner in (membership.role, role) and caller_membership.role != OrganizationRoles.owner:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    # Repeated role assignments do not require persistence or reconciliation.
    if membership.role == role:
        return

    # Reject demotion when no other active owner remains.
    if membership.role == OrganizationRoles.owner:
        other_owner_id = await session.scalar(
            select(col(UserOrganization.user_id))
            .where(
                col(UserOrganization.organization_id) == organization_id,
                col(UserOrganization.role) == OrganizationRoles.owner,
                col(UserOrganization.user_id) != member_id,
            )
            # Lock the surviving owner before permitting demotion.
            .limit(1)
            .with_for_update()
        )

        # Demoting the final active owner would make the Organization unmanageable.
        if other_owner_id is None:
            raise HTTPException(status_code=409, detail="Organization must have at least one owner")

    # Persist the role change.
    membership.role = role


async def remove_member(session: AsyncSession, organization_id: UUID, member_id: UUID, user_id: UUID) -> None:
    """Remove access without removing historical user records or charging the organization."""

    # Serialize member changes and revalidate the caller after taking the organization lock.
    _, caller = await lock_active_access(session, user_id, organization_id, OrganizationRoles.admin)

    # Lock the target membership after authorizing the caller.
    membership = await session.get(UserOrganization, (member_id, organization_id), populate_existing=True, with_for_update=True)
    if membership is None:
        raise HTTPException(status_code=404, detail="Organization member not found")

    # Only owners can remove owners, and every organization must retain an active owner.
    if membership.role == OrganizationRoles.owner:
        if caller.role != OrganizationRoles.owner:
            raise HTTPException(status_code=403, detail="Owner management permissions required")
        other_owner = await session.scalar(
            select(col(UserOrganization.user_id))
            .join(User, col(User.id) == col(UserOrganization.user_id))
            .where(
                # Other tenants cannot satisfy the remaining-owner requirement.
                col(UserOrganization.organization_id) == organization_id,
                col(UserOrganization.role) == OrganizationRoles.owner,
                # Only another active owner can make this removal safe.
                col(UserOrganization.user_id) != member_id,
                col(User.deleted_at).is_(None),
            )
            .limit(1)
        )
        if other_owner is None:
            raise HTTPException(status_code=409, detail="Organization must have at least one owner")

    # Revoke membership without creating automatic charges or refunds.
    await session.delete(membership)


async def create(session: AsyncSession, name: str, user: User) -> Organization:
    """Create an Organization on the least-assigned available infrastructure."""

    # Serialize each creator's quota check and insert to prevent concurrent requests exceeding the beta limit.
    locked_user_id = await session.scalar(
        select(col(User.id)).where(col(User.id) == user.id, col(User.deleted_at).is_(None)).with_for_update()
    )
    if locked_user_id is None:
        raise HTTPException(status_code=403, detail="Access required")

    organization_limit_result = await session.execute(
        select(1)
        .where(col(Organization.created_id) == user.id, col(Organization.deleted_at).is_(None))
        # A third active Organization exceeds the beta allowance.
        .offset(2)
        .limit(1)
        .with_for_update()
    )
    if organization_limit_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409, detail="Organization limit reached during the beta. Contact LongLink to request additional organizations."
        )

    # Lock the least-assigned Compute until the Organization assignment is committed.
    compute_assignments = (
        select(func.count(col(Organization.id))).where(col(Organization.compute_id) == col(ComputeRegistry.id)).scalar_subquery()
    )
    compute_id = await session.scalar(
        select(col(ComputeRegistry.id)).order_by(compute_assignments, col(ComputeRegistry.name)).limit(1).with_for_update()
    )
    if compute_id is None:
        raise HTTPException(status_code=503, detail="No ready compute registry available")

    # A no-op write serializes admission on every supported backend, including SQLite.
    result = cast(
        CursorResult[tuple[object, ...]],
        await session.execute(
            sql_update(ComputeRegistry).where(col(ComputeRegistry.id) == compute_id).values(name=col(ComputeRegistry.name))
        ),
    )
    if result.rowcount != 1:
        raise HTTPException(status_code=503, detail="No compute registry available")

    # Build the Organization with its immutable infrastructure assignments.
    organization = Organization(name=name, slug=names.slugify(name), compute_id=compute_id)

    # Attach the creator as the initial owner for every organization.
    organization.created_id = user.id

    # Translate unique conflicts from autoflush without invalidating the caller's transaction.
    try:
        async with session.begin_nested():
            session.add(UserOrganization(user_id=user.id, organization_id=organization.id, role=OrganizationRoles.owner))
            session.add(organization)
            await session.flush()

            # Store the All filter once so later renames and deletions remain permanent.
            session.add(OrganizationTag(organization_id=organization.id, name="All", kind=TagKind.all, icon=TagIcon.app_window))
            await session.flush()

    # Keep Organization uniqueness collisions at the service boundary as an API conflict.
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Organization already exists")

    # Queue infrastructure creation in the caller's transaction after persisting the Organization.
    await operations.enqueue(session, kind=OperationKind.organization_create, target_id=organization.id)
    return organization


async def create_invitation(session: AsyncSession, organization_id: UUID, payload: OrganizationInvitationCreate, user_id: UUID) -> None:
    """Authorize and create one Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    organization, membership = await lock_active_access(session, user_id, organization_id, OrganizationRoles.maintain)
    if not roles.atleast(membership.role, payload.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    # Pending invitations do not count against the organization's member allowance.
    if organization.stripe_payment_method_id is None and await member_count(session, organization_id) >= FREE_USERS:
        raise HTTPException(status_code=409, detail=f"Register a card before adding more than {FREE_USERS} members.")

    # Reject emails that already belong to the locked Organization.
    if (
        await session.scalar(
            select(col(User.id))
            .join(UserOrganization, col(UserOrganization.user_id) == col(User.id))
            .where(col(UserOrganization.organization_id) == organization_id, col(User.email) == payload.email)
        )
        is not None
    ):
        raise HTTPException(status_code=409, detail="User is already a member")

    # Re-inviting replaces the existing active grant and refreshes its delivery timestamp.
    invitation_statement = (
        select(OrganizationInvitation)
        .where(col(OrganizationInvitation.organization_id) == organization_id, col(OrganizationInvitation.email) == payload.email)
        .with_for_update()
    )
    invitation = await session.scalar(invitation_statement)

    # Create the grant while the Organization lock serializes invitation commands.
    if invitation is None:
        invitation = OrganizationInvitation(organization_id=organization_id, email=payload.email, role=payload.role)
        session.add(invitation)
        await session.flush()
        return

    invitation.role = payload.role
    invitation.created_at = datetime.now(UTC)


async def revoke_invitation(session: AsyncSession, organization_id: UUID, invitation_id: UUID, user_id: UUID) -> None:
    """Authorize and revoke one active Organization invitation."""

    # Lock the Organization before revalidating the caller's active invitation permission.
    _, membership = await lock_active_access(session, user_id, organization_id, OrganizationRoles.maintain)

    # Resolve only an invitation belonging to the locked Organization.
    invitation = await session.get(OrganizationInvitation, invitation_id, with_for_update=True)
    if invitation is None or invitation.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if not roles.atleast(membership.role, invitation.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    await session.delete(invitation)


async def soft_delete(session: AsyncSession, organization_id: UUID, user: User) -> Organization:
    """Tombstone an Organization and nested state."""

    # Lock the Organization state before tombstoning its nested rows.
    organization = await session.get(Organization, organization_id, with_for_update=True)
    if organization is None:
        if user.administrator:
            raise HTTPException(status_code=404, detail="Organization not found")
        raise HTTPException(status_code=403, detail="Access required")

    # Revalidate active owners while the Organization is locked for deletion and retries.
    if not user.administrator:
        membership = await session.get(UserOrganization, (user.id, organization_id), with_for_update=True)
        if membership is None:
            raise HTTPException(status_code=403, detail="Access required")

        # Lifecycle deletion is reserved for Organization owners.
        if not roles.atleast(membership.role, OrganizationRoles.owner):
            raise HTTPException(status_code=403, detail="Permission required")

    # Record nested tombstones once; repeated requests only ensure cleanup remains queued.
    if organization.deleted_at is None:
        now = datetime.now(UTC)
        organization.deleted_at = now
        organization.deleted_id = user.id
        organization.updated_at = now
        organization.updated_id = user.id

        # Tombstone every active Solution without loading each object.
        await session.execute(
            sql_update(Solution)
            .where(col(Solution.organization_id) == organization_id, col(Solution.deleted_at).is_(None))
            .values(deleted_at=now, deleted_id=user.id, updated_at=now, updated_id=user.id)
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
