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

    # Hide compute targets while asynchronous deletion is in progress.
    async with session_scope() as session:
        statement = select(ComputeRegistry).where(ComputeRegistry.status != Status.deleting)
        return list(await session.scalars(statement))


async def get(registry_id: UUID, include_deleting: bool = False) -> ComputeRegistry | None:
    """Return one compute backend by id."""

    # Build the lookup within one scoped session.
    async with session_scope() as session:
        statement = select(ComputeRegistry).where(ComputeRegistry.id == registry_id)

        # Deleting registries remain available only to their reconciliation operation.
        if not include_deleting:
            statement = statement.where(ComputeRegistry.status != Status.deleting)

        return (await session.scalars(statement)).one_or_none()


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


async def delete(registry_id: UUID) -> tuple[ComputeRegistry, Operation] | None:
    """Mark an unused compute target for cluster cleanup."""

    # Lock the target before checking assignments and queueing cleanup.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, registry_id, with_for_update=True)
        if registry is None:
            return None

        # Organizations retain their assigned compute until provider cleanup finishes.
        organization_id = await session.scalar(select(Organization.id).where(Organization.compute_id == registry_id).limit(1))
        if organization_id is not None:
            raise HTTPException(status_code=409, detail="Compute registry is used by organizations")

        # The first request marks lifecycle state before queueing cleanup.
        if registry.status != Status.deleting:
            registry.status = Status.deleting
            registry.version = None

        # Compute deletion owns only gateway and cluster-bootstrap resources after Organizations are gone.
        operation = await operations.enqueue_in_session(
            session,
            registry.id,
            locked_compute=registry,
        )
        await session.commit()
        return registry, operation


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

        # Successful cleanup removes the internal registry after its external resources are gone.
        if registry.status == Status.deleting:
            await session.delete(registry)
            await session.commit()
            return True

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
        registry = await session.scalar(
            update(ComputeRegistry)
            .where(
                ComputeRegistry.id == compute_id,
                ComputeRegistry.status == expected_status,
                ComputeRegistry.status != Status.deleting,
            )
            .values(status=status)
            .returning(ComputeRegistry)
        )
        await session.commit()
        return registry is not None
