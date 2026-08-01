from uuid import UUID
from sqlalchemy import select
from src.errors import ConflictError
from sqlalchemy.exc import IntegrityError
from collections.abc import Sequence
from src.environments import env
from src.models.types import PlatformVersion
from packaging.version import Version
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.computes import ComputeRegistry
from src.database.models.organizations import Organization


async def fetch() -> Sequence[ComputeRegistry]:
    """Return registered compute backends."""

    # Return every registered compute target.
    async with session_scope() as session:
        return (await session.scalars(select(ComputeRegistry))).all()


async def get(registry_id: UUID) -> ComputeRegistry | None:
    """Return one compute backend by id."""

    # Load the requested compute registration.
    async with session_scope() as session:
        return await session.get(ComputeRegistry, registry_id)


async def create(name: str, kubeconfig: dict[str, object]) -> ComputeRegistry:
    """Register one compute target."""

    # Persist the target without coupling registry management to lifecycle scheduling.
    async with session_scope() as session:
        registry = ComputeRegistry(
            name=name,
            kubeconfig=kubeconfig,
            version=env.VERSION,
        )
        session.add(registry)

        # Translate unique registry names to one stable API conflict.
        try:
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

        # Operations retain historical state and naturally complete if their compute target no longer exists.
        await session.delete(registry)
        await session.commit()
        return True


async def record_success(
    compute_id: UUID,
    platform_version: PlatformVersion,
    gateway_url: str | None,
    expected_status: Status,
) -> bool:
    """Persist successful compute state without allowing a Platform release regression."""

    # Lock the compute while updating its observed release.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        if registry is None or registry.status != expected_status:
            return False
        if Version(registry.version) > Version(platform_version):
            return False

        registry.gateway_url = gateway_url
        registry.version = platform_version
        registry.status = Status.running
        await session.commit()
        return True


async def replace_gateway_tls(
    compute_id: UUID,
    ca_certificate: str,
    certificate: str,
    private_key: str,
) -> bool:
    """Persist one complete gateway TLS identity."""

    # Lock the compute so concurrent creation operations cannot publish partial identities.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        if registry is None:
            return False

        # Replace every dependent value in the same transaction.
        registry.gateway_ca_certificate = ca_certificate
        registry.gateway_identity_certificate = certificate
        registry.gateway_identity_private_key = private_key
        await session.commit()
        return True
