import contextlib
from uuid import UUID
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import update
from src.logger import logger
from src.operations import storage, databases
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.database.models.organizations import Organization


async def reconcile(organization_id: UUID) -> None:
    """Keep the Organization database active throughout boundary reconciliation."""

    # Removed lifecycle targets are already converged and must not acquire runtime demand.
    async with session_scope() as session:
        organization = await session.get(Organization, organization_id)
    if organization is None or organization.deleted_at is not None:
        return
    async with databases.activity(organization_id):
        await _reconcile(organization_id)


async def _reconcile(organization_id: UUID) -> None:
    """Converge one Organization's shared providers and Kubernetes boundary."""

    # Skip removed Organizations.
    async with session_scope() as session:
        infrastructure = await organizations.infrastructure(session, organization_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        logger.info("Organization %s is unavailable for reconciliation; skipping", organization_id)
        return
    organization = infrastructure.organization

    # Converge the Organization bucket before Solutions receive scoped credentials.
    logger.info("Creating object storage bucket for Organization %s", organization.id)
    # Apply release changes to the Organization Namespace, quota, and network boundary.
    logger.info("Applying Kubernetes boundary for Organization %s", organization.id)
    cluster = Kubernetes(
        infrastructure.compute.kubeconfig,
    )
    async with contextlib.aclosing(cluster):
        bucket = await cluster.storage.bucket(organization.id, infrastructure.compute, create=True)
        await storage.authorize(bucket.storage, bucket.name, organization.id)
        await cluster.organizations.apply(f"longlink-compute-{organization.id.hex}")

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
        organization = await session.get(Organization, organization_id)
    if organization is None:
        return None
    if organization.deleted_at is None:
        return "Active Organizations cannot be deleted by lifecycle cleanup"
    async with databases.deleting(organization_id):
        return await _delete(organization_id)


async def _delete(organization_id: UUID) -> str | None:
    """Remove one Organization's routes, Solutions, Namespace, providers, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        infrastructure = await organizations.infrastructure(session, organization_id)
    if infrastructure is None:
        logger.info("Organization %s no longer exists; skipping deletion", organization_id)
        return None
    if infrastructure.organization.deleted_at is None:
        return "Active Organizations cannot be deleted by lifecycle cleanup"
    cluster = Kubernetes(
        infrastructure.compute.kubeconfig,
    )

    # Namespace deletion cascades every Solution Kubernetes resource and waits for all Pods to terminate.
    logger.info("Deleting Kubernetes boundary for Organization %s", infrastructure.organization.id)
    async with contextlib.aclosing(cluster):
        await cluster.organizations.delete(f"longlink-compute-{infrastructure.organization.id.hex}")
        # Delete the dedicated CNPG boundary only after compute Pods have terminated.
        await cluster.databases.delete(infrastructure.organization.id)
        logger.info("Deleting object storage for Organization %s", infrastructure.organization.id)
        await cluster.storage.delete(infrastructure.organization.id, infrastructure.compute)

    # Purge the tombstone only after all external resources are absent.
    logger.info("Purging Organization %s", infrastructure.organization.id)
    async with session_scope() as session:
        await session.execute(sql_delete(Organization).where(col(Organization.id) == infrastructure.organization.id))
        await session.commit()
