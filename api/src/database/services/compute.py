from uuid import UUID
from fastapi import HTTPException
from sqlmodel import col
from sqlalchemy import or_, func, select
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from src.database.types import attr
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession, pagination: Pagination, search: str = "") -> tuple[Sequence[ComputeRegistry], int]:
    """Return one newest-first page of compute registries."""

    # Match literal names and infrastructure endpoints before pagination.
    query = select(ComputeRegistry)
    if search:
        query = query.where(
            or_(
                col(ComputeRegistry.name).icontains(search, autoescape=True),
                col(ComputeRegistry.gateway_url).icontains(search, autoescape=True),
                col(ComputeRegistry.storage_endpoint).icontains(search, autoescape=True),
            )
        )

    # Load only the fields exposed by the administrator response.
    statement = (
        query.options(
            load_only(
                attr(ComputeRegistry.id),
                attr(ComputeRegistry.name),
                attr(ComputeRegistry.gateway_url),
                attr(ComputeRegistry.database_storage_class),
                attr(ComputeRegistry.storage_endpoint),
            )
        )
        # Keep pagination deterministic when registrations share a timestamp.
        .order_by(col(ComputeRegistry.created_at).desc(), col(ComputeRegistry.id).desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count matches before pagination using the same search filters.
    count_result = await session.execute(select(func.count()).select_from(query.subquery()))
    return result.all(), count_result.scalar_one()


async def delete(session: AsyncSession, registry_id: UUID) -> None:
    """Remove an unused compute registration without modifying external resources."""

    # Lock the target before checking assignments and deleting it.
    registry = await session.get(ComputeRegistry, registry_id, options=(load_only(attr(ComputeRegistry.id)),), with_for_update=True)
    if registry is None:
        raise HTTPException(status_code=404, detail="Compute registry not found")

    # Organizations must retain a valid registered compute assignment.
    if await session.scalar(select(col(Organization.id)).where(col(Organization.compute_id) == registry_id).limit(1)) is not None:
        raise HTTPException(status_code=409, detail="Compute registry is used by organizations")

    # Delete only after no Organization depends on the registration.
    await session.delete(registry)
