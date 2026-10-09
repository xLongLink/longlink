import src.database.services.organizations
from uuid import UUID
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import select, update
from src.errors import ForbiddenError
from src.logger import logger
from src.kubernetes import databases as database_resources
from src.kubernetes import organizations
from src.operations import databases, registries
from src.models.statuses import Status
from src.database.session import session_scope
from src.kubernetes.client import Kubernetes
from src.kubernetes.storage import Storage
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


async def reconcile(organization_id: UUID) -> None:
    """Provision the Organization database, then reconcile its boundary and publish it."""

    # Provision the database before Solutions receive scoped credentials.
    if not await databases.ready(organization_id):
        return
    # Skip removed Organizations.
    async with session_scope() as session:
        target = await src.database.services.organizations.infrastructure(session, organization_id)
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
        storage = Storage(compute, cluster)
        await storage.apply(organization.id, quota_bytes=organization.storage_quota_bytes)
        await organizations.apply(cluster, organization.id)
        await registries.synchronize(cluster, organization.id)

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


async def delete(organization_id: UUID) -> None:
    """Drain runtime activity before destroying the Organization's boundaries."""

    # Delegate deletion eligibility and lease admission to the locked database scope.
    async with databases.deleting(organization_id):
        # An absent tombstone means a previous execution completed cleanup.
        async with session_scope() as session:
            target = await src.database.services.organizations.infrastructure(session, organization_id)
        if target is None:
            logger.info("Organization %s no longer exists; skipping deletion", organization_id)
            return
        organization, compute = target
        if organization.deleted_at is None:
            raise ForbiddenError("Active Organizations cannot be deleted by lifecycle cleanup")
        async with session_scope() as session:
            result = await session.scalars(select(col(Solution.id)).where(col(Solution.organization_id) == organization_id))
            solution_ids = result.all()
        cluster = Kubernetes(
            compute.kubeconfig,
        )

        # Namespace deletion cascades every Solution Kubernetes resource and waits for all Pods to terminate.
        logger.info("Deleting Kubernetes boundary for Organization %s", organization.id)
        async with cluster:
            await organizations.delete(cluster, organization.id)
            # Delete the dedicated CNPG boundary only after compute Pods have terminated.
            await database_resources.delete(cluster, organization.id)
            logger.info("Deleting object storage for Organization %s", organization.id)
            storage = Storage(compute, cluster)
            await storage.delete(organization.id, solution_ids)

        # Purge the tombstone only after all external resources are absent.
        logger.info("Purging Organization %s", organization.id)
        async with session_scope() as session:
            await session.execute(sql_delete(Organization).where(col(Organization.id) == organization.id))
            await session.commit()
