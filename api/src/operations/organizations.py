from uuid import UUID
from sqlalchemy import select, update
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
        return
    organization = infrastructure.organization

    # Apply idempotent SDK migrations before updating Platform-owned user rows.
    await Postgres(
        infrastructure.database.host,
        infrastructure.database.port,
        infrastructure.database.username,
        infrastructure.database.password,
        infrastructure.database.sslmode,
    ).prepare_organization_database(organization.id)

    # Converge the Organization bucket before Applications receive scoped credentials.
    await Exoscale(
        infrastructure.storage.endpoint_url,
        infrastructure.storage.access_key_id,
        infrastructure.storage.secret_access_key,
    ).create(organization.id.hex)

    # Apply release changes to the Organization Namespace, quota, and network boundary.
    cluster = Kubernetes(infrastructure.compute.kubeconfig)
    await cluster.organizations.apply(organization.id.hex)

    # Publish the Organization after its provider and Kubernetes boundaries are ready.
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
    await cluster.organizations.delete(infrastructure.organization.id.hex)
    for application_id in application_ids:
        await db.delete_schema(infrastructure.organization.id, application_id)
        await object_storage.revoke(application_id.hex)

    await db.delete_database(infrastructure.organization.id)
    await object_storage.delete(infrastructure.organization.id.hex)
    async with session_scope() as session:
        await organizations.purge(session, infrastructure.organization.id)
        await session.commit()
