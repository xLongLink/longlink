from uuid import UUID
from sqlmodel import col
from src.utils import names, roles
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError, ForbiddenError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, contains_eager
from collections.abc import Sequence
from src.models.roles import OrganizationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.database.services import operations
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.solutions import Solution
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
    name: str,
    image: Image,
    secrets: dict[str, str],
    description: str | None = None,
    *,
    user_id: UUID,
) -> Solution:
    """Create an Organization-owned LongLink Solution."""

    # Lock the Organization before creating a Solution against its assignment.
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
    if membership is None or membership.deleted_at is not None:
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
        created_id=user_id,
        organization_id=organization_id,
        name=name,
        slug=names.slugify(name),
        description=description,
        image_desired=image,
        secrets=secrets,
        updated_id=user_id,
    )

    # Let the Organization-scoped database constraint arbitrate slug uniqueness.
    try:
        async with session.begin_nested():
            session.add(solution)
            await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Solution slug already exists") from exc

    await operations.enqueue(
        session,
        kind=OperationKind.solution_create,
        target_id=solution.id,
    )

    return solution


async def delete(session: AsyncSession, solution_id: UUID, user_id: UUID) -> None:
    """Authorize, tombstone, and queue cleanup for one LongLink Solution."""

    # Lock active solution access before changing its lifecycle state.
    result = await session.execute(
        select(Solution, col(UserOrganization.role))
        .join(UserOrganization, col(UserOrganization.organization_id) == col(Solution.organization_id))
        .where(
            col(Solution.id) == solution_id,
            col(Solution.deleted_at).is_(None),
            col(UserOrganization.user_id) == user_id,
            col(UserOrganization.deleted_at).is_(None),
        )
        .with_for_update()
    )
    row = result.one_or_none()
    if row is None:
        raise ForbiddenError("Access required")
    solution, role = row
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Record the tombstone and schedule external cleanup in one transaction.
    now = utcnow()
    solution.deleted_at = now
    solution.deleted_id = user_id
    solution.updated_at = now
    solution.updated_id = user_id

    await operations.enqueue(
        session,
        kind=OperationKind.solution_delete,
        target_id=solution.id,
    )
