from uuid import UUID
from sqlalchemy import select, update
from src.logger import logger
from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def reconcile(organization_id: UUID) -> None:
    """Converge one Organization's shared providers and Kubernetes boundary."""

    # Skip removed Organizations.
    async with session_scope() as session:
        infrastructure = await organizations.infrastructure(session, organization_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        logger.info("Organization %s is unavailable for reconciliation; skipping", organization_id)
        return
    organization = infrastructure.organization

    # Apply idempotent SDK migrations before updating Platform-owned user rows.
    logger.info("Preparing PostgreSQL database for Organization %s", organization.id)
    await Postgres(
        infrastructure.database.host,
        infrastructure.database.port,
        infrastructure.database.username,
        infrastructure.database.password,
        infrastructure.database.sslmode,
    ).prepare_organization_database(organization.id)

    # Converge the Organization bucket before Applications receive scoped credentials.
    logger.info("Creating object storage bucket for Organization %s", organization.id)
    await Exoscale(
        infrastructure.storage.endpoint_url,
        infrastructure.storage.access_key_id,
        infrastructure.storage.secret_access_key,
    ).create(organization.id.hex)

    # Apply release changes to the Organization Namespace, quota, and network boundary.
    logger.info("Applying Kubernetes boundary for Organization %s", organization.id)
    cluster = Kubernetes(infrastructure.compute.kubeconfig)
    try:
        await cluster.organizations.apply(organization.id.hex)
    finally:
        await cluster.aclose()

    # Publish the Organization after its provider and Kubernetes boundaries are ready.
    logger.info("Publishing Organization %s", organization.id)
    async with session_scope() as session:
        await session.execute(
            update(Organization)
            .where(
                Organization.id == organization.id,
                Organization.deleted_at.is_(None),
                Organization.status.in_((Status.creating, Status.failed)),
            )
            .values(status=Status.running)
        )

        # Synchronize users only after every Organization boundary is ready for publication.
        await organizations.sync_users(session, organization.id)
        await session.commit()


async def delete(organization_id: UUID) -> str | None:
    """Remove one Organization's routes, Applications, Namespace, providers, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        infrastructure = await organizations.infrastructure(session, organization_id)
    if infrastructure is None:
        logger.info("Organization %s no longer exists; skipping deletion", organization_id)
        return None
    if infrastructure.organization.deleted_at is None:
        return "Active Organizations cannot be deleted by lifecycle cleanup"
    cluster = Kubernetes(infrastructure.compute.kubeconfig)

    db = Postgres(
        infrastructure.database.host,
        infrastructure.database.port,
        infrastructure.database.username,
        infrastructure.database.password,
        infrastructure.database.sslmode,
    )
    object_storage = Exoscale(
        infrastructure.storage.endpoint_url,
        infrastructure.storage.access_key_id,
        infrastructure.storage.secret_access_key,
    )

    # Namespace deletion cascades every Application Kubernetes resource and waits for all Pods to terminate.
    async with session_scope() as session:
        application_ids_result = await session.scalars(
            select(Application.id).where(Application.organization_id == infrastructure.organization.id)
        )
        application_ids = application_ids_result.all()
    logger.info("Deleting Kubernetes boundary for Organization %s", infrastructure.organization.id)
    try:
        await cluster.organizations.delete(infrastructure.organization.id.hex)
    finally:
        await cluster.aclose()
    for application_id in application_ids:
        logger.info("Deleting provider resources for Application %s", application_id)
        await db.delete_schema(infrastructure.organization.id, application_id)
        await object_storage.revoke(application_id.hex)

    logger.info("Deleting PostgreSQL database for Organization %s", infrastructure.organization.id)
    await db.delete_database(infrastructure.organization.id)
    logger.info("Deleting object storage bucket for Organization %s", infrastructure.organization.id)
    await object_storage.delete(infrastructure.organization.id.hex)

    # Purge the tombstone only after all external resources are absent.
    logger.info("Purging Organization %s", infrastructure.organization.id)
    async with session_scope() as session:
        await organizations.purge(session, infrastructure.organization.id)
        await session.commit()
