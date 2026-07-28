import secrets
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from packaging.version import Version
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def fetch() -> list[ComputeRegistry]:
    """Return registered compute backends."""

    # Return every registered compute target.
    async with session_scope() as session:
        return list(await session.scalars(select(ComputeRegistry)))


async def get(registry_id: UUID) -> ComputeRegistry | None:
    """Return one compute backend by id."""

    # Load the requested compute registration.
    async with session_scope() as session:
        return await session.get(ComputeRegistry, registry_id)


async def create(name: str, slug: str, kubeconfig: str) -> tuple[ComputeRegistry, Operation]:
    """Register one compute target and queue its initial reconciliation."""

    # Persist the target and its outbox row atomically.
    async with session_scope() as session:
        registry = ComputeRegistry(
            name=name,
            slug=slug,
            kubeconfig=kubeconfig,
            proxy_secret=secrets.token_urlsafe(32),
        )
        session.add(registry)

        # Translate unique registry names and slugs to one stable API conflict.
        try:
            operation = await operations.enqueue_in_session(session, registry.id)
            await session.commit()
        except IntegrityError as exc:
            raise HTTPException(status_code=409, detail="Compute registry already exists") from exc

        return registry, operation


async def delete(registry_id: UUID) -> bool:
    """Remove an unused compute registration without modifying external resources."""

    # Lock the target before checking assignments and deleting it.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, registry_id, with_for_update=True)
        if registry is None:
            return False

        # Organizations must retain a valid registered compute assignment.
        organization_id = await session.scalar(select(Organization.id).where(Organization.compute_id == registry_id).limit(1))
        if organization_id is not None:
            raise HTTPException(status_code=409, detail="Compute registry is used by organizations")

        # Operations retain historical state and naturally complete if their compute target no longer exists.
        await session.delete(registry)
        await session.commit()
        return True


async def record_success(
    compute_id: UUID,
    platform_version: str,
    gateway_url: str | None,
    expected_status: Status,
    satisfy_pending: bool = False,
) -> bool:
    """Persist successful compute state without allowing a Platform release regression."""

    # Lock the compute while updating its observed release.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        if registry is None or registry.status != expected_status:
            return False
        if registry.version is not None and Version(registry.version) > Version(platform_version):
            return False

        registry.gateway_url = gateway_url
        registry.version = platform_version
        registry.status = Status.running

        # Inline reconciliation can atomically retire fallback work that it fully satisfied.
        if satisfy_pending:
            await session.execute(
                update(Operation)
                .where(
                    Operation.kind == OperationKind.compute_reconcile,
                    Operation.target_id == compute_id,
                    Operation.platform_version == platform_version,
                    Operation.lease_expires_at.is_(None),
                    Operation.finished_at.is_(None),
                )
                .values(finished_at=utcnow())
            )
        await session.commit()
        return True


async def initialize_gateway_tls(compute_id: UUID, ca_certificate: str, certificate: str, private_key: str) -> bool:
    """Persist a compute's immutable gateway TLS identity once."""

    # Lock the compute so concurrent first reconciliations cannot publish different identities.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        if registry is None:
            return False

        # Accept an idempotent retry but reject any attempt to replace persisted TLS.
        current = (
            registry.gateway_ca_certificate,
            registry.gateway_tls_certificate,
            registry.gateway_tls_private_key,
        )
        desired = (ca_certificate, certificate, private_key)
        if current == desired:
            return True
        if any(value is not None for value in current):
            raise RuntimeError("Compute registry gateway TLS identity is immutable")
        registry.gateway_ca_certificate = ca_certificate
        registry.gateway_tls_certificate = certificate
        registry.gateway_tls_private_key = private_key
        await session.commit()
        return True


async def set_status(compute_id: UUID, expected_status: Status, status: Status) -> bool:
    """Transition one active compute target from the expected lifecycle state."""

    # Guard reconciliation writes from stale attempts after deletion or another transition.
    async with session_scope() as session:
        result = await session.execute(
            update(ComputeRegistry)
            .where(
                ComputeRegistry.id == compute_id,
                ComputeRegistry.status == expected_status,
            )
            .values(status=status)
        )
        if result.rowcount != 1:
            return False
        await session.commit()
        return True
