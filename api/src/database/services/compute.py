from uuid import UUID
from sqlmodel import col
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
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
                ComputeRegistry.gateway_url,
                ComputeRegistry.database_size_gib,
                ComputeRegistry.database_instances,
                ComputeRegistry.database_storage_class,
                ComputeRegistry.storage_class,
                ComputeRegistry.storage_endpoint,
                ComputeRegistry.storage_size_gib,
                ComputeRegistry.storage_instances,
                ComputeRegistry.status,
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


async def create(
    session: AsyncSession,
    name: str,
    kubeconfig: dict[str, object],
    *,
    gateway_url: str,
    database_storage_class: str,
    storage_class: str,
    storage_endpoint: str,
    storage_size_gib: int = 100,
    storage_instances: int = 3,
    storage_certificate: str | None = None,
    gateway_certificate: str | None = None,
    database_size_gib: int = 10,
    database_instances: int = 1,
) -> ComputeRegistry:
    """Register one compute target."""

    # Persist the target and its initial reconciliation request atomically.
    registry = ComputeRegistry(
        name=name,
        kubeconfig=kubeconfig,
        gateway_url=gateway_url,
        gateway_certificate=gateway_certificate,
        database_storage_class=database_storage_class,
        database_size_gib=database_size_gib,
        database_instances=database_instances,
        storage_class=storage_class,
        storage_endpoint=storage_endpoint,
        storage_size_gib=storage_size_gib,
        storage_instances=storage_instances,
        storage_certificate=storage_certificate,
    )
    session.add(registry)

    # Translate unique registry names to one stable API conflict.
    try:
        session.add(Operation(kind=OperationKind.compute_create, target_id=registry.id))
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

    # Retain the Compute while its Gateway lifecycle may still use its Kubernetes credentials.
    if (
        await session.scalar(
            select(col(Operation.id))
            .where(
                col(Operation.kind) == OperationKind.compute_create,
                col(Operation.target_id) == registry_id,
                col(Operation.finished_at).is_(None),
            )
            .limit(1)
        )
        is not None
    ):
        raise ConflictError("Compute registry has unfinished lifecycle operation")

    # Delete only after no Organization or active Compute lifecycle depends on the registration.
    await session.delete(registry)
