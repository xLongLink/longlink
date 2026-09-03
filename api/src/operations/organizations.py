from uuid import UUID
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import select, update
from src.logger import logger
from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.solutions import Solution
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
    database = Postgres(
        infrastructure.database.host,
        infrastructure.database.port,
        infrastructure.database.username,
        infrastructure.database.password,
        infrastructure.database.sslmode,
    )
    await database.prepare_organization_database(organization.id)

    # Converge the Organization bucket before Solutions receive scoped credentials.
    logger.info("Creating object storage bucket for Organization %s", organization.id)
    object_storage = Exoscale(
        infrastructure.storage.endpoint_url,
        infrastructure.storage.access_key_id,
        infrastructure.storage.secret_access_key,
    )
    await object_storage.create(organization.id.hex)

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
                col(Organization.id) == organization.id,
                col(Organization.deleted_at).is_(None),
                col(Organization.status).in_((Status.creating, Status.failed)),
            )
            .values(status=Status.running)
        )

        # Synchronize users only after every Organization boundary is ready for publication.
        await organizations.sync_users(session, organization.id)
        await session.commit()


async def delete(organization_id: UUID) -> str | None:
    """Remove one Organization's routes, Solutions, Namespace, providers, and tombstone."""

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

    # Namespace deletion cascades every Solution Kubernetes resource and waits for all Pods to terminate.
    async with session_scope() as session:
        solution_ids_result = await session.scalars(
            select(col(Solution.id)).where(col(Solution.organization_id) == infrastructure.organization.id)
        )
        solution_ids = solution_ids_result.all()
    logger.info("Deleting Kubernetes boundary for Organization %s", infrastructure.organization.id)
    try:
        await cluster.organizations.delete(infrastructure.organization.id.hex)
    finally:
        await cluster.aclose()
    for solution_id in solution_ids:
        logger.info("Deleting provider resources for Solution %s", solution_id)
        await db.delete_solution_schema(infrastructure.organization.id, solution_id)
        await object_storage.revoke_solution(solution_id.hex)

    logger.info("Deleting PostgreSQL database for Organization %s", infrastructure.organization.id)
    await db.delete_database(infrastructure.organization.id)
    logger.info("Deleting object storage bucket for Organization %s", infrastructure.organization.id)
    await object_storage.delete(infrastructure.organization.id.hex)

    # Purge the tombstone only after all external resources are absent.
    logger.info("Purging Organization %s", infrastructure.organization.id)
    async with session_scope() as session:
        await session.execute(sql_delete(Organization).where(col(Organization.id) == infrastructure.organization.id))
        await session.commit()
