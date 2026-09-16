from uuid import UUID
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import select, update
from src.logger import logger
from src.kubernetes import organizations as kubernetes_organizations
from src.operations import databases
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.storage import Storage
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


async def reconcile(organization_id: UUID) -> None:
    """Reconcile the Organization boundary and publish it."""

    # Removed lifecycle targets are already converged and must not acquire runtime demand.
    async with session_scope() as session:
        active_organization_id = await session.scalar(
            select(col(Organization.id)).where(
                col(Organization.id) == organization_id,
                col(Organization.deleted_at).is_(None),
            )
        )
    if active_organization_id is None:
        return
    # Skip removed Organizations.
    async with session_scope() as session:
        target = await organizations.infrastructure(session, organization_id)
    if target is None:
        logger.info("Organization %s is unavailable for reconciliation; skipping", organization_id)
        return
    organization, compute = target
    if organization.deleted_at is not None:
        logger.info("Organization %s is unavailable for reconciliation; skipping", organization_id)
        return

    # Converge the Organization bucket before Solutions receive scoped credentials.
    logger.info("Creating object storage bucket for Organization %s", organization.id)
    logger.info("Applying Kubernetes boundary for Organization %s", organization.id)
    cluster = Kubernetes(
        compute.kubeconfig,
    )
    async with cluster:
        storage = Storage(compute)
        await storage.apply(organization.id, quota_bytes=organization.storage_quota_bytes)
        await kubernetes_organizations.apply(
            cluster,
            organization.id,
            cpu_limit=organization.compute_cpu_limit,
            memory_limit_gib=organization.compute_memory_limit_gib,
            ephemeral_limit_gib=organization.compute_ephemeral_limit_gib,
            pods=organization.compute_pods,
        )

    # Publish the Organization after its provider and Kubernetes boundaries are ready.
    logger.info("Publishing Organization %s", organization.id)
    async with session_scope() as session:
        await session.execute(
            update(Organization)
            .where(
                col(Organization.id) == organization.id,
                col(Organization.deleted_at).is_(None),
                col(Organization.status).in_((Status.creating, Status.failed)),
            )
            .values(status=Status.running)
        )

        await session.commit()


async def delete(organization_id: UUID) -> str | None:
    """Drain runtime activity before destroying the Organization's boundaries."""

    # Reject active targets before waiting for their admitted runtime work.
    async with session_scope() as session:
        result = await session.execute(
            select(col(Organization.id), col(Organization.deleted_at)).where(col(Organization.id) == organization_id)
        )
        target = result.tuples().one_or_none()
    if target is None:
        return None
    _, deleted_at = target
    if deleted_at is None:
        return "Active Organizations cannot be deleted by lifecycle cleanup"
    async with databases.deleting(organization_id):
        # An absent tombstone means a previous execution completed cleanup.
        async with session_scope() as session:
            target = await organizations.infrastructure(session, organization_id)
        if target is None:
            logger.info("Organization %s no longer exists; skipping deletion", organization_id)
            return None
        organization, compute = target
        if organization.deleted_at is None:
            return "Active Organizations cannot be deleted by lifecycle cleanup"
        async with session_scope() as session:
            result = await session.scalars(select(col(Solution.id)).where(col(Solution.organization_id) == organization_id))
            solution_ids = result.all()
        cluster = Kubernetes(
            compute.kubeconfig,
        )

        # Namespace deletion cascades every Solution Kubernetes resource and waits for all Pods to terminate.
        logger.info("Deleting Kubernetes boundary for Organization %s", organization.id)
        async with cluster:
            await kubernetes_organizations.delete(cluster, organization.id)
            # Delete the dedicated CNPG boundary only after compute Pods have terminated.
            await cluster.databases.delete(organization.id)
            logger.info("Deleting object storage for Organization %s", organization.id)
            storage = Storage(compute)
            await storage.delete(organization.id, solution_ids)

        # Purge the tombstone only after all external resources are absent.
        logger.info("Purging Organization %s", organization.id)
        async with session_scope() as session:
            await session.execute(sql_delete(Organization).where(col(Organization.id) == organization.id))
            await session.commit()
