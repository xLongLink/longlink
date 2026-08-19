from uuid import UUID
from sqlalchemy import func, select
from src.errors import ConflictError
from sqlalchemy.exc import IntegrityError
from collections.abc import Sequence
from src.models.statuses import Status
from src.database.services import operations
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession) -> Sequence[ComputeRegistry]:
    """Return registered compute backends."""

    # Return every registered compute target.
    result = await session.scalars(select(ComputeRegistry))
    return result.all()


async def available(session: AsyncSession) -> UUID | None:
    """Return the ID of the least-used ready compute registry."""

    # Order ready compute registries by their active Organization assignment count.
    assignments = (
        select(func.count(Organization.id))
        .where(Organization.compute_id == ComputeRegistry.id, Organization.deleted_at.is_(None))
        .scalar_subquery()
    )
    return await session.scalar(
        select(ComputeRegistry.id).where(ComputeRegistry.status == Status.running).order_by(assignments, ComputeRegistry.name).limit(1)
    )


async def create(session: AsyncSession, name: str, kubeconfig: dict[str, object]) -> ComputeRegistry:
    """Register one compute target."""

    # Persist the target and its initial reconciliation request atomically.
    registry = ComputeRegistry(name=name, kubeconfig=kubeconfig)
    session.add(registry)

    # Translate unique registry names to one stable API conflict.
    try:
        await session.flush()
        await operations.enqueue(session, registry.id, kind=OperationKind.compute_create, target_id=registry.id)
    except IntegrityError as exc:
        raise ConflictError("Compute registry already exists") from exc

    return registry


async def delete(session: AsyncSession, registry_id: UUID) -> bool:
    """Remove an unused compute registration without modifying external resources."""

    # Lock the target before checking assignments and deleting it.
    registry = await session.get(ComputeRegistry, registry_id, with_for_update=True)
    if registry is None:
        return False

    # Organizations must retain a valid registered compute assignment.
    if await session.scalar(select(Organization.id).where(Organization.compute_id == registry_id).limit(1)) is not None:
        raise ConflictError("Compute registry is used by organizations")

    # Retain the Compute while its Gateway lifecycle may still use its Kubernetes credentials.
    if (
        await session.scalar(
            select(Operation.id)
            .where(
                Operation.kind == OperationKind.compute_create,
                Operation.target_id == registry_id,
                Operation.finished_at.is_(None),
            )
            .limit(1)
        )
        is not None
    ):
        raise ConflictError("Compute registry has unfinished lifecycle operation")

    # Delete only after no Organization or active Compute lifecycle depends on the registration.
    await session.delete(registry)
    return True


async def record_success(
    session: AsyncSession,
    compute_id: UUID,
    gateway_url: str,
    gateway_certificate: str,
    gateway_client_identity: str,
    expected_status: Status,
) -> bool:
    """Publish successful Compute and Gateway state when its lifecycle state is current."""

    # Lock the compute while publishing its current gateway connection material.
    registry = await session.get(ComputeRegistry, compute_id, with_for_update=True)
    if registry is None or registry.status != expected_status:
        return False

    registry.gateway_url = gateway_url
    registry.gateway_certificate = gateway_certificate
    registry.gateway_client_identity = gateway_client_identity
    registry.status = Status.running
    return True
