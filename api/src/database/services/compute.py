from uuid import UUID
from sqlmodel import col
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.organizations import Organization


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[ComputeRegistry], int]:
    """Return one ordered page of compute registries."""

    # Load only the fields exposed by the administrator response.
    statement = (
        select(ComputeRegistry)
        .options(
            load_only(
                ComputeRegistry.id,
                ComputeRegistry.name,
                ComputeRegistry.kubeconfig,
                ComputeRegistry.gateway_url,
                ComputeRegistry.database_storage_class,
                ComputeRegistry.storage_endpoint,
            )
        )
        .order_by(col(ComputeRegistry.name), col(ComputeRegistry.id))
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count every registered compute target.
    count_result = await session.execute(select(func.count()).select_from(ComputeRegistry))
    return result.all(), count_result.scalar_one()


async def create(session: AsyncSession, registry: ComputeRegistry) -> ComputeRegistry:
    """Register one verified compute target as immediately assignable."""

    # Persist the inline-verified target; duplicates translate to one stable API conflict.
    session.add(registry)

    # Translate duplicate names or physical clusters to one stable API conflict.
    try:
        await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Compute registry already exists") from exc

    return registry


async def delete(session: AsyncSession, registry_id: UUID) -> None:
    """Remove an unused compute registration without modifying external resources."""

    # Lock the target before checking assignments and deleting it.
    registry = await session.get(
        ComputeRegistry,
        registry_id,
        options=(load_only(ComputeRegistry.id),),
        with_for_update=True,
    )
    if registry is None:
        raise NotFoundError("Compute registry not found")

    # Organizations must retain a valid registered compute assignment.
    if await session.scalar(select(col(Organization.id)).where(col(Organization.compute_id) == registry_id).limit(1)) is not None:
        raise ConflictError("Compute registry is used by organizations")

    # Delete only after no Organization depends on the registration.
    await session.delete(registry)
