from uuid import UUID
from fastapi import HTTPException
from sqlmodel import col
from sqlalchemy import Select, func, select
from sqlalchemy.orm import load_only, selectinload, contains_eager
from collections.abc import Sequence
from src.database.types import attr
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Revision, Solution
from src.database.models.organizations import Organization


def _metadata_query() -> Select[Solution]:
    """Select published display metadata without management or infrastructure fields."""

    # Keep infrastructure, release configuration, and secrets outside public metadata reads.
    return (
        select(Solution)
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .where(col(Solution.public).is_(True), col(Solution.deleted_at).is_(None), col(Organization.deleted_at).is_(None))
        .options(
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
    )


async def fetch(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[Solution], int]:
    """Read one page of explicitly published Solutions in active Organizations."""

    # Apply pagination only after the shared publication and metadata restrictions.
    query = _metadata_query()
    statement = (
        query.order_by(col(Solution.created_at).desc(), col(Solution.id).desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    result = await session.scalars(statement)
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    return result.all(), total or 0


async def detail(session: AsyncSession, solution_id: UUID) -> Solution:
    """Read one published Solution's display metadata."""

    # Private, deleted, and unknown Solutions share the same response.
    statement = _metadata_query().where(col(Solution.id) == solution_id)
    result = await session.scalars(statement)
    solution = result.one_or_none()
    if solution is None:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution


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
