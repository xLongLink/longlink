from uuid import UUID
from sqlmodel import col
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from src.models.computes import ComputeRegistryCreate, ComputeRegistryEndpointUpdate
from src.models.statuses import Status
from src.database.services import operations
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Revision, Solution
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
                ComputeRegistry.kubeconfig,
                ComputeRegistry.gateway_url,
                ComputeRegistry.database_size_gib,
                ComputeRegistry.database_instances,
                ComputeRegistry.database_storage_class,
                ComputeRegistry.storage_endpoint,
                ComputeRegistry.bucket_size_bytes,
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


async def create(session: AsyncSession, payload: ComputeRegistryCreate, cluster_uid: str) -> ComputeRegistry:
    """Register one compute target."""

    # Persist the target and its initial validation request atomically.
    registry = ComputeRegistry(
        **payload.model_dump(),
        cluster_uid=cluster_uid,
    )
    session.add(registry)

    # Translate duplicate names or physical clusters to one stable API conflict.
    try:
        await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Compute registry already exists") from exc
    await operations.enqueue(session, kind=OperationKind.compute_validate, target_id=registry.id)

    return registry


async def rotate_endpoints(session: AsyncSession, payload: ComputeRegistryEndpointUpdate) -> ComputeRegistry:
    """Replace one Compute's reachable endpoints and queue dependent reconciliation."""

    # Lock the physical Compute identity so concurrent rotations cannot overwrite endpoint trust.
    registry = await session.scalar(
        select(ComputeRegistry).where(col(ComputeRegistry.cluster_uid) == payload.cluster_uid).with_for_update()
    )
    if registry is None:
        raise NotFoundError("Compute registry not found")

    # Never supersede validation after it has begun because it may have observed the prior endpoints.
    active_validation = await session.scalar(
        select(Operation.id)
        .where(
            col(Operation.kind) == OperationKind.compute_validate,
            col(Operation.target_id) == registry.id,
            col(Operation.finished_at).is_(None),
        )
        .limit(1)
    )
    if active_validation is not None:
        raise ConflictError("Compute validation is in progress")

    registry.gateway_url = payload.gateway_url
    registry.gateway_certificate = payload.gateway_certificate
    registry.storage_endpoint = payload.storage_endpoint
    registry.storage_certificate = payload.storage_certificate
    registry.status = Status.creating
    await operations.enqueue(session, kind=OperationKind.compute_validate, target_id=registry.id)

    # Reapply existing workloads because their injected storage endpoint follows the Compute registry.
    statement = (
        select(Solution.desired_revision_id, Solution.deployed_revision_id, Revision.failed)
        .join(Organization, col(Organization.id) == col(Solution.organization_id))
        .outerjoin(Revision, col(Revision.id) == col(Solution.desired_revision_id))
        .where(col(Organization.compute_id) == registry.id, col(Organization.deleted_at).is_(None), col(Solution.deleted_at).is_(None))
    )
    result = await session.execute(statement)
    for desired_revision_id, deployed_revision_id, desired_revision_failed in result.tuples():
        revision_id = desired_revision_id if desired_revision_id is not None and desired_revision_failed is False else deployed_revision_id
        if revision_id is not None:
            await operations.enqueue(session, kind=OperationKind.solution_deploy, target_id=revision_id)

    return registry


async def by_cluster_uid(session: AsyncSession, cluster_uid: str) -> ComputeRegistry:
    """Return one registered Compute by its immutable Kubernetes identity."""

    # The deployment controller uses the same physical identity established at registration.
    registry = await session.scalar(select(ComputeRegistry).where(col(ComputeRegistry.cluster_uid) == cluster_uid))
    if registry is None:
        raise NotFoundError("Compute registry not found")
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

    # Retain the Compute while validation may still use its Kubernetes credentials.
    if (
        await session.scalar(
            select(col(Operation.id))
            .where(
                col(Operation.kind) == OperationKind.compute_validate,
                col(Operation.target_id) == registry_id,
                col(Operation.finished_at).is_(None),
            )
            .limit(1)
        )
        is not None
    ):
        raise ConflictError("Compute registry has unfinished validation operation")

    # Delete only after no Organization or active Compute validation depends on the registration.
    await session.delete(registry)
