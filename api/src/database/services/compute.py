import secrets
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from packaging.version import Version
from longlink.utils.time import utcnow
from src.models.statuses import ComputeStatus
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
        statement = select(ComputeRegistry).where(ComputeRegistry.status != ComputeStatus.deleting)
        result = await session.execute(statement)
        return result.scalars().all()


async def get(registry_id: UUID, include_deleting: bool = False) -> ComputeRegistry | None:
    """Return one compute backend by id."""

    # Build the lookup within one scoped session.
    async with session_scope() as session:
        conditions = [ComputeRegistry.id == registry_id]

        # Deleting registries remain available only to their reconciliation operation.
        if not include_deleting:
            conditions.append(ComputeRegistry.status != ComputeStatus.deleting)

        statement = select(ComputeRegistry).where(*conditions)
        result = await session.execute(statement)
        return result.scalar_one_or_none()


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
            await session.rollback()
            raise HTTPException(status_code=409, detail="Compute registry already exists") from exc

        return registry, operation


async def delete(registry_id: UUID) -> tuple[ComputeRegistry, Operation] | None:
    """Mark an unused compute target for cluster cleanup."""

    # Lock the target before checking assignments and queueing cleanup.
    async with session_scope() as session:
        registry = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == registry_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None:
            return None

        # Organizations retain their assigned compute until provider cleanup finishes.
        organization_id = (
            await session.execute(select(Organization.id).where(Organization.compute_id == registry_id).limit(1))
        ).scalar_one_or_none()
        if organization_id is not None:
            raise HTTPException(status_code=409, detail="Compute registry is used by organizations")

        # The first request marks lifecycle state and receives a fresh cleanup attempt budget.
        fresh = registry.status != ComputeStatus.deleting
        if fresh:
            registry.status = ComputeStatus.deleting
            registry.version = None

        # Compute deletion owns only gateway and cluster-bootstrap resources after Organizations are gone.
        operation = await operations.enqueue_in_session(
            session,
            registry.id,
            locked_compute=registry,
            fresh=fresh,
        )
        await session.commit()
        return registry, operation


async def record_success(
    compute_id: UUID,
    platform_version: str,
    gateway_url: str | None,
    gateway_ca_certificate: str | None,
    gateway_tls_certificate: str | None,
    gateway_tls_private_key: str | None,
    satisfy_pending: bool = False,
) -> bool:
    """Persist successful compute state without allowing a Platform release regression."""

    # Lock the compute while updating its observed release.
    async with session_scope() as session:
        registry = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None:
            return False
        if registry.version is not None and Version(registry.version) > Version(platform_version):
            return False

        # Successful cleanup removes the internal registry after its external resources are gone.
        if registry.status == ComputeStatus.deleting:
            await session.delete(registry)
            await session.commit()
            return True

        registry.gateway_url = gateway_url
        registry.gateway_ca_certificate = gateway_ca_certificate
        registry.gateway_previous_ca_certificate = None
        registry.gateway_tls_certificate = gateway_tls_certificate
        registry.gateway_tls_private_key = gateway_tls_private_key
        registry.version = platform_version
        registry.status = ComputeStatus.ready

        # Inline reconciliation can atomically retire fallback work that it fully satisfied.
        if satisfy_pending:
            await session.execute(
                update(Operation)
                .where(
                    Operation.kind == OperationKind.compute_reconcile,
                    Operation.target_id == compute_id,
                    Operation.platform_version == platform_version,
                    Operation.started_at.is_(None),
                    Operation.stopped_at.is_(None),
                )
                .values(stopped_at=utcnow())
            )
        await session.commit()
        return True


async def record_failure(compute_id: UUID) -> None:
    """Mark a compute target failed."""

    # Lock the compute while updating its observed state.
    async with session_scope() as session:
        registry = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None:
            return
        if registry.status != ComputeStatus.deleting:
            registry.status = ComputeStatus.failed
        await session.commit()


async def stage_gateway_tls(compute_id: UUID, ca_certificate: str, certificate: str, private_key: str) -> bool:
    """Persist new gateway trust while retaining the previously served CA during rollout."""

    # Lock the compute while staging replacement trust.
    async with session_scope() as session:
        registry = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == compute_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None:
            return False

        # Proxy clients trust both CA versions until reconciliation verifies the new gateway rollout.
        if registry.gateway_ca_certificate != ca_certificate:
            registry.gateway_previous_ca_certificate = registry.gateway_ca_certificate
        registry.gateway_ca_certificate = ca_certificate
        registry.gateway_tls_certificate = certificate
        registry.gateway_tls_private_key = private_key
        await session.commit()
        return True
