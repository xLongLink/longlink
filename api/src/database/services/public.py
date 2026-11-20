from uuid import UUID
from fastapi import HTTPException
from sqlmodel import col
from sqlalchemy import func, select
from sqlalchemy.orm import load_only, selectinload, contains_eager
from collections.abc import Sequence
from src.database.types import attr
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Revision, Solution
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession, pagination: Pagination, solution_id: UUID | None = None) -> tuple[Sequence[Solution], int]:
    """Read only explicitly published Solutions in active Organizations."""

    # Keep infrastructure, release configuration, and secrets outside public metadata reads.
    query = (
        select(Solution)
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .where(col(Solution.public).is_(True), col(Solution.deleted_at).is_(None), col(Organization.deleted_at).is_(None))
    )
    if solution_id is not None:
        query = query.where(col(Solution.id) == solution_id)

    # Load only display metadata and the deployed version.
    statement = (
        query.options(
            load_only(
                attr(Solution.id),
                attr(Solution.name),
                attr(Solution.description),
                attr(Solution.status),
                attr(Solution.public),
                attr(Solution.deployed_revision_id),
                raiseload=True,
            ),
            contains_eager(attr(Solution.organization)).load_only(attr(Organization.id), attr(Organization.name), raiseload=True),
            selectinload(attr(Solution.deployed_revision)).load_only(attr(Revision.version), raiseload=True),
        )
        .order_by(col(Solution.created_at).desc(), col(Solution.id).desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    return result.all(), total or 0


async def runtime(session: AsyncSession, solution_id: UUID) -> tuple[Solution, ComputeRegistry]:
    """Resolve a published runtime without borrowing any member's authority."""

    # Recheck publication on every request, including requests from logged-in viewers.
    statement = (
        select(Solution, ComputeRegistry)
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        .options(
            load_only(
                attr(Solution.id),
                attr(Solution.organization_id),
                attr(Solution.secrets),
                attr(Solution.status),
                attr(Solution.deployed_revision_id),
            ),
            load_only(attr(ComputeRegistry.id), attr(ComputeRegistry.gateway_url), attr(ComputeRegistry.gateway_certificate)),
        )
        .where(
            col(Solution.id) == solution_id,
            col(Solution.public).is_(True),
            col(Solution.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
        )
        .execution_options(populate_existing=True)
    )
    result = await session.execute(statement)
    access = result.one_or_none()
    if access is None:
        raise HTTPException(status_code=404, detail="Solution not found")
    return access
