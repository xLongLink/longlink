from uuid import UUID
from sqlalchemy import func, select
from src.errors import ConflictError
from sqlalchemy.exc import IntegrityError
from collections.abc import Sequence
from src.environments import env
from src.models.types import PlatformVersion
from packaging.version import Version
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def fetch() -> Sequence[ComputeRegistry]:
    """Return registered compute backends."""

    # Return every registered compute target.
    async with session_scope() as session:
        return (await session.scalars(select(ComputeRegistry))).all()


async def available() -> ComputeRegistry | None:
    """Return the least-used ready compute registry."""

    # Order ready compute registries by their active Organization assignment count.
    async with session_scope() as session:
        assignments = (
            select(func.count(Organization.id))
            .where(Organization.compute_id == ComputeRegistry.id, Organization.deleted_at.is_(None))
            .scalar_subquery()
        )
        return await session.scalar(
            select(ComputeRegistry).where(ComputeRegistry.status == Status.running).order_by(assignments, ComputeRegistry.name).limit(1)
        )


async def get(registry_id: UUID) -> ComputeRegistry | None:
    """Return one compute backend by id."""

    # Load the requested compute registration.
    async with session_scope() as session:
        return await session.get(ComputeRegistry, registry_id)


async def create(name: str, kubeconfig: dict[str, object]) -> ComputeRegistry:
    """Register one compute target."""

    # Persist the target and its initial reconciliation request atomically.
    async with session_scope() as session:
        registry = ComputeRegistry(
            name=name,
            kubeconfig=kubeconfig,
            version=env.VERSION,
        )
        session.add(registry)

        # Translate unique registry names to one stable API conflict.
        try:
            await session.flush()
            await operations.enqueue(session, registry.id, kind=OperationKind.compute_create, target_id=registry.id)
            await session.commit()
        except IntegrityError as exc:
            raise ConflictError("Compute registry already exists") from exc

        return registry


async def delete(registry_id: UUID) -> bool:
    """Remove an unused compute registration without modifying external resources."""

    # Lock the target before checking assignments and deleting it.
    async with session_scope() as session:
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
        await session.commit()
        return True


async def record_success(
    compute_id: UUID,
    platform_version: PlatformVersion,
    gateway_url: str,
    gateway_api_key: str,
    gateway_certificate: str,
    expected_status: Status,
) -> bool:
    """Publish successful Compute and Gateway state without allowing a Platform release regression."""

    # Lock the compute while updating its observed release.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        if registry is None or registry.status != expected_status:
            return False
        if Version(registry.version) > Version(platform_version):
            return False

        registry.gateway_url = gateway_url
        registry.gateway_api_key = gateway_api_key
        registry.gateway_certificate = gateway_certificate
        registry.version = platform_version
        registry.status = Status.running
        await session.commit()
        return True
