from uuid import UUID
from typing import Literal
from sqlmodel import col
from src.utils import names, roles, images
from sqlalchemy import func, select, update
from src.errors import InvalidError, ConflictError, NotFoundError, ForbiddenError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, raiseload, contains_eager
from collections.abc import Mapping, Sequence
from src.models.roles import OrganizationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.metadata import LongLinkMetadata
from src.models.solutions import SolutionCreate, EnvironmentValues
from src.database.services import operations
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.solutions import Revision, Solution
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[Solution], int]:
    """Return one ordered page of active solutions for administrator views."""

    # Load page response data without loading encrypted solution secrets.
    statement = (
        select(Solution)
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .options(
            contains_eager(Solution.organization),
            defer(Solution.secrets),
        )
        .where(col(Solution.deleted_at).is_(None))
        .order_by(col(Organization.name), col(Solution.name), col(Solution.id))
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count only rows eligible for the administrator listing.
    count_result = await session.execute(select(func.count()).select_from(Solution).where(col(Solution.deleted_at).is_(None)))
    return result.all(), count_result.scalar_one()


async def create(
    session: AsyncSession,
    organization_id: UUID,
    payload: SolutionCreate,
    metadata: LongLinkMetadata,
    *,
    user_id: UUID,
) -> Solution:
    """Create an Organization-owned LongLink Solution."""

    # Lock the Organization before creating a Solution against its assignment.
    if session.get_bind().dialect.name == "sqlite":
        await session.execute(
            update(Organization).where(col(Organization.id) == organization_id).values(updated_at=col(Organization.updated_at))
        )
    organization = await session.scalar(select(Organization).where(col(Organization.id) == organization_id).with_for_update())
    if organization is None:
        raise NotFoundError("Organization not found")
    if organization.deleted_at is not None:
        raise ConflictError("Organization is not available")

    # Revalidate the caller after locking the Organization so revoked access cannot use stale request state.
    membership = await session.get(
        UserOrganization,
        (user_id, organization_id),
        populate_existing=True,
        with_for_update=True,
    )
    if membership is None:
        raise ForbiddenError("Access required")
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Serialize solution creation through the locked Organization to enforce the beta limit.
    solution_limit_result = await session.execute(
        select(col(Solution.id))
        .where(
            col(Solution.organization_id) == organization_id,
            col(Solution.deleted_at).is_(None),
        )
        .offset(2)
        .limit(1)
        .with_for_update()
    )
    if solution_limit_result.scalar_one_or_none() is not None:
        raise ConflictError("Solution limit reached during the beta. Contact LongLink to request additional solutions.")

    # Build the Solution row before checking its Organization-scoped uniqueness.
    solution = Solution(
        organization_id=organization_id,
        name=payload.name,
        slug=names.slugify(payload.name),
        description=payload.description,
        secrets={},
    )

    # Let the Organization-scoped database constraint arbitrate slug uniqueness.
    try:
        async with session.begin_nested():
            session.add(solution)
            await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Solution slug already exists") from exc

    # Creation uses the same immutable release boundary as subsequent updates.
    await deploy(
        session,
        solution,
        user_id,
        metadata,
        payload.envs,
        source=payload.image,
        min_scale=payload.min_scale,
    )

    return solution


async def access(session: AsyncSession, solution_id: UUID, user_id: UUID, *, lock: bool = True) -> Solution:
    """Lock one active Solution and revalidate maintenance access."""

    # SQLite needs a write reservation because SELECT FOR UPDATE is a no-op there.
    if lock and session.get_bind().dialect.name == "sqlite":
        await session.execute(update(Solution).where(col(Solution.id) == solution_id).values(updated_at=col(Solution.updated_at)))

    # Serialize commands and permission changes before recording a deployment.
    statement = (
        select(Solution, col(UserOrganization.role))
        .options(defer(Solution.secrets), raiseload(Solution.desired_revision))
        .join(UserOrganization, col(UserOrganization.organization_id) == col(Solution.organization_id))
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .where(
            col(Solution.id) == solution_id,
            col(Solution.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
            col(UserOrganization.user_id) == user_id,
        )
        .execution_options(populate_existing=True)
    )
    if lock:
        statement = statement.with_for_update(of=(Solution, UserOrganization))
    result = await session.execute(statement)
    row = result.one_or_none()
    if row is None:
        raise ForbiddenError("Access required")
    solution, role = row
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")
    return solution


async def deploy(
    session: AsyncSession,
    solution: Solution,
    user_id: UUID,
    metadata: LongLinkMetadata,
    envs: Mapping[str, str | None],
    *,
    source: Image | None = None,
    min_scale: Literal[0, 1] | None = None,
) -> None:
    """Append a snapshot and queue its exact deployment target."""

    # Merge the patch into the serialized desired snapshot, not the last deployed release.
    current = await session.get(Revision, solution.desired_revision_id) if solution.desired_revision_id is not None else None
    merged = dict(current.envs) if current is not None else {}
    for name, value in envs.items():
        if value is None:
            merged.pop(name, None)
        else:
            merged[name] = value
    try:
        EnvironmentValues.validate_environment_variables({name: value or "" for name, value in envs.items()})
        EnvironmentValues.validate_environment_variables(merged)
    except ValueError as exc:
        raise InvalidError(str(exc)) from exc
    missing = images.missing_envs(metadata, merged)
    if missing:
        raise InvalidError(f"Solution environment does not satisfy required image variables: {', '.join(missing)}")

    # Preserve omitted scaling and reject identical snapshots before queuing work.
    if min_scale is None:
        min_scale = current.min_scale if current is not None else 0
    if source is None:
        source = metadata.image
    if (
        current is not None
        and not current.failed
        and current.image == metadata.image
        and current.source == source
        and current.envs == merged
        and current.min_scale == min_scale
    ):
        raise ConflictError("Source and configuration are up to date. No revision was created.")

    # Never change Solution-owned runtime credentials when appending a release.
    revision = Revision(
        solution_id=solution.id,
        image=metadata.image,
        source=source,
        min_scale=min_scale,
        envs=merged,
        created_id=user_id,
    )
    session.add(revision)
    await session.flush()
    solution.desired_revision_id = revision.id
    await operations.enqueue(session, kind=OperationKind.solution_deploy, target_id=revision.id)


async def rollback(session: AsyncSession, solution: Solution, revision_id: UUID, user_id: UUID) -> None:
    """Select a previously deployed snapshot without reversing migrations."""

    # Only this Solution's proven releases are safe rollback candidates.
    revision = await session.get(Revision, revision_id)
    if revision is None or revision.solution_id != solution.id:
        raise NotFoundError("Revision not found")
    if revision.deployed_at is None:
        raise ConflictError("Revision has never been deployed successfully")
    solution.desired_revision_id = revision.id
    await operations.enqueue(session, kind=OperationKind.solution_deploy, target_id=revision.id)


async def delete(session: AsyncSession, solution_id: UUID, user_id: UUID) -> None:
    """Authorize, tombstone, and queue cleanup for one LongLink Solution."""

    # Use the same locked maintenance boundary as deployment commands.
    solution = await access(session, solution_id, user_id)

    # Record the tombstone and schedule external cleanup in one transaction.
    now = utcnow()
    solution.deleted_at = now
    solution.updated_at = now

    await operations.enqueue(
        session,
        kind=OperationKind.solution_delete,
        target_id=solution.id,
    )
