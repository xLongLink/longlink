from uuid import UUID
from sqlmodel import col
from sqlalchemy import update
from src.logger import logger
from src.kubernetes import gateway
from src.models.statuses import Status
from src.database.session import session_scope
from src.kubernetes.client import Kubernetes
from src.kubernetes.storage import Storage
from src.database.models.computes import ComputeRegistry


async def validate(compute_id: UUID) -> str | None:
    """Validate externally installed infrastructure and publish Compute readiness."""

    # Load the operator-configured endpoint and trust without tenant relationships.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute_id)
    if registry is None:
        logger.info("Compute %s no longer exists; skipping reconciliation", compute_id)
        return None
    cluster = Kubernetes(
        registry.kubeconfig,
    )

    # Readiness includes Serving, Kourier, CNPG, and the verified HTTPS endpoint.
    async with cluster:
        if await cluster.cluster_uid() != registry.cluster_uid:
            raise ValueError("Registered Compute connection points to a different physical cluster")
        logger.info("Validating shared controllers for Compute %s", registry.id)
        await gateway.verify(cluster, registry.gateway_url, registry.gateway_certificate)
        logger.info("Validating RustFS object storage for Compute %s", registry.id)
        storage = Storage()
        await storage.verify(registry)

    # Preserve operator connection input and avoid overwriting a concurrent lifecycle change.
    async with session_scope() as session:
        result = await session.execute(
            update(ComputeRegistry)
            .where(col(ComputeRegistry.id) == registry.id, col(ComputeRegistry.status) == registry.status)
            .values(status=Status.running)
        )
        if result.rowcount != 1:
            return "Compute readiness was not recorded"
        await session.commit()
