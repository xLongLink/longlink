from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime
from sqlmodel import col
from src.utils import names, roles, images
from sqlalchemy import or_, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, selectinload, contains_eager
from collections.abc import Mapping, Sequence
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.database.types import attr
from src.models.metadata import LongLinkMetadata
from src.models.solutions import SolutionPatch, SolutionCreate, SolutionUpdateCheck, validate_environment_variables
from src.database.services import operations, registries, organizations
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import MAX_SOLUTIONS
from src.database.models.solutions import Revision, Solution
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession, pagination: Pagination, search: str = "") -> tuple[Sequence[Solution], int]:
    """Return one newest-first page of active solutions for administrator views."""

    # Match literal Solution details and owning Organization names before pagination.
    query = (
        select(Solution).join(Organization, col(Organization.id) == col(Solution.organization_id)).where(col(Solution.deleted_at).is_(None))
    )
    if search:
        query = query.where(
            or_(
                col(Solution.name).icontains(search, autoescape=True),
                col(Solution.slug).icontains(search, autoescape=True),
                col(Solution.description).icontains(search, autoescape=True),
                # Administrators can also locate Solutions by their owning Organization.
                col(Organization.name).icontains(search, autoescape=True),
            )
        )

    # Load response image and deployment state without decrypting secrets or revision environments.
    statement = (
        query.options(
            contains_eager(attr(Solution.organization)).load_only(
                attr(Organization.id), attr(Organization.name), attr(Organization.slug), attr(Organization.status)
            ),
            defer(attr(Solution.secrets)),
            selectinload(attr(Solution.desired_revision)).load_only(attr(Revision.image), attr(Revision.failed), raiseload=True),
            selectinload(attr(Solution.deployed_revision)).load_only(attr(Revision.version), raiseload=True),
            selectinload(attr(Solution.tag_assignments)),
        )
        # Use the identity as a tie-breaker for stable pagination.
        .order_by(col(Solution.created_at).desc(), col(Solution.id).desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count matches before pagination using the same visibility and search filters.
    count_result = await session.execute(select(func.count()).select_from(query.subquery()))
    return result.all(), count_result.scalar_one()


async def create(
    session: AsyncSession,
    organization_id: UUID,
    metadata: LongLinkMetadata,
    *,
    payload: SolutionCreate,
    user_id: UUID,
    # Private images retain their Organization-owned registry connection.
    registry_connection_id: UUID | None = None,
) -> Solution:
    """Create an Organization-owned LongLink Solution."""

    # Serialize creation against Organization deletion and capacity checks.
    organization = await organizations.lock_row(session, organization_id)
    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if organization.deleted_at is not None:
        raise HTTPException(status_code=409, detail="Organization is not available")

    # Revalidate the caller after locking the Organization so revoked access cannot use stale request state.
    await organizations.locked_membership(session, user_id, organization_id, OrganizationRoles.maintain)

    # Serialize solution creation through the locked Organization to enforce the beta limit.
    solution_limit_result = await session.execute(
        select(col(Solution.id))
        .where(col(Solution.organization_id) == organization_id, col(Solution.deleted_at).is_(None))
        .offset(MAX_SOLUTIONS)
        .limit(1)
        .with_for_update()
    )

    # Reject creation before allocating a Solution or release snapshot.
    if solution_limit_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409, detail="Solution limit reached during the beta. Contact LongLink to request additional solutions."
        )

    # Build the Solution row before checking its Organization-scoped uniqueness.
    solution = Solution(
        organization_id=organization_id, name=payload.name, slug=names.slugify(payload.name), description=payload.description, secrets={}
    )

    # Let the Organization-scoped database constraint arbitrate slug uniqueness.
    try:
        async with session.begin_nested():
            session.add(solution)
            await session.flush()

    # Expose slug collisions without discarding the surrounding transaction.
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Solution slug already exists")

    # Creation uses the same immutable release boundary as subsequent updates.
    await _deploy(session, solution, user_id, metadata, payload.envs, registry_connection_id=registry_connection_id)

    return solution


async def access(session: AsyncSession, solution_id: UUID, user_id: UUID, *, lock: bool = True) -> Solution:
    """Lock one active Solution and revalidate maintenance access."""

    # SQLite needs a write reservation because SELECT FOR UPDATE is a no-op there.
    if lock and session.get_bind().dialect.name == "sqlite":
        await session.execute(update(Solution).where(col(Solution.id) == solution_id).values(updated_at=col(Solution.updated_at)))

    # Serialize commands and permission changes before recording a deployment.
    statement = (
        select(Solution, col(UserOrganization.role))
        .options(defer(attr(Solution.secrets)))
        .join(UserOrganization, col(UserOrganization.organization_id) == col(Solution.organization_id))
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .where(
            col(Solution.id) == solution_id,
            col(Solution.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
            # Authorization is scoped to the requesting Organization member.
            col(UserOrganization.user_id) == user_id,
        )
        # Refresh any identity-map state before a command takes its lock.
        .execution_options(populate_existing=True)
    )
    if lock:
        statement = statement.with_for_update(of=(Solution, UserOrganization))
    result = await session.execute(statement)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Read access does not imply permission to change releases.
    solution, role = row
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")
    return solution


async def _update_candidate(
    session: AsyncSession, solution: Solution, user_id: UUID, expected_revision_id: UUID | None = None
) -> tuple[Solution, Revision, LongLinkMetadata]:
    """Inspect the repository's latest image and revalidate the desired revision."""

    # Reuse authorized Solution access without holding command locks across registry calls.
    solution_id = solution.id
    if expected_revision_id is not None and expected_revision_id != solution.desired_revision_id:
        raise HTTPException(status_code=409, detail="Desired revision changed since review. Check again.")
    revision = await session.get(Revision, solution.desired_revision_id) if solution.desired_revision_id is not None else None
    if revision is None:
        raise HTTPException(status_code=409, detail="Solution has no desired revision")

    # Follow latest for updates, including Solutions created with a version tag or digest.
    source = Image(revision.image)
    source = Image(f"{source.registry}/{source.repository}:latest")
    revision_id = revision.id
    connection = await registries.resolve(session, solution.organization_id, revision.registry_connection_id, source)
    await session.commit()
    metadata = await images.required_metadata(source, connection)

    # Revalidate permissions and the source after inspection before returning a candidate.
    if revision.registry_connection_id is not None:
        await registries.lock(session, solution.organization_id)
    solution = await access(session, solution_id, user_id)
    if solution.desired_revision_id != revision_id:
        raise HTTPException(status_code=409, detail="Desired revision changed during inspection. Check again.")
    return solution, revision, metadata


async def check_update(session: AsyncSession, solution: Solution, user_id: UUID) -> SolutionUpdateCheck:
    """Describe the inspected candidate without exposing release admission state."""

    # Expose the reviewed revision and configured names, never environment values.
    _solution, revision, metadata = await _update_candidate(session, solution, user_id)
    return SolutionUpdateCheck(
        current_image=revision.image,
        current_version=revision.version,
        metadata=metadata,
        revision_id=revision.id,
        configured_envs=sorted(revision.envs),
    )


async def apply_update(session: AsyncSession, solution: Solution, user_id: UUID, payload: SolutionPatch) -> None:
    """Inspect and admit an update in the caller's final transaction."""

    # Inspect without command locks, then revalidate the desired state and maintenance access.
    solution, _revision, metadata = await _update_candidate(session, solution, user_id, payload.expected_revision_id)

    # Compare and merge only against the current serialized desired state.
    await _deploy(session, solution, user_id, metadata, payload.envs)


async def _deploy(
    session: AsyncSession,
    solution: Solution,
    user_id: UUID,
    metadata: LongLinkMetadata,
    envs: Mapping[str, str | None],
    *,
    registry_connection_id: UUID | None = None,
) -> None:
    """Append a snapshot and queue its exact deployment target."""

    # Load the complete desired snapshot even if a listing cached only its image and failure state.
    current = (
        await session.get(Revision, solution.desired_revision_id, populate_existing=True)
        if solution.desired_revision_id is not None
        else None
    )

    # Keep the registry connection immutable and serialize admission with connection deletion.
    if current is not None:
        registry_connection_id = current.registry_connection_id
    if registry_connection_id is not None:
        await registries.lock(session, solution.organization_id)
        await registries.resolve(session, solution.organization_id, registry_connection_id, metadata.image)

    # Apply explicit environment edits while preserving untouched secrets.
    merged = dict(current.envs) if current is not None else {}
    for name, value in envs.items():
        if value is None:
            merged.pop(name, None)
        else:
            merged[name] = value

    # Validate the resulting environment, including unchanged variables.
    try:
        validate_environment_variables(merged)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    missing = images.missing_envs(metadata, merged)

    # Required image variables must exist in the complete merged environment.
    if missing:
        raise HTTPException(status_code=422, detail=f"Solution environment does not satisfy required image variables: {', '.join(missing)}")

    # Never change Solution-owned runtime credentials when appending a release.
    revision = Revision(
        solution_id=solution.id,
        image=metadata.image,
        version=metadata.version,
        envs=merged,
        created_id=user_id,
        registry_connection_id=registry_connection_id,
    )
    session.add(revision)
    await session.flush()

    # Publish and enqueue the immutable snapshot in the caller's transaction.
    solution.desired_revision_id = revision.id
    await operations.enqueue(session, kind=OperationKind.solution_deploy, target_id=revision.id)


async def delete(session: AsyncSession, solution_id: UUID, user_id: UUID) -> None:
    """Authorize, tombstone, and queue cleanup for one LongLink Solution."""

    # Use the same locked maintenance boundary as deployment commands.
    solution = await access(session, solution_id, user_id)

    # Record the tombstone and schedule external cleanup in one transaction.
    now = datetime.now(UTC)
    solution.deleted_at = now
    solution.deleted_id = user_id
    solution.updated_at = now
    solution.updated_id = user_id

    await operations.enqueue(session, kind=OperationKind.solution_delete, target_id=solution.id)
