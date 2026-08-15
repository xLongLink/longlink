from sqlalchemy import select
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import applications, organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.operations import Operation
from src.database.models.applications import Application


async def reconcile(claimed: Operation) -> str | None:
    """Converge one Organization's shared providers and Kubernetes boundary."""

    # Skip removed Organizations.
    async with session_scope() as session:
        infrastructure = await organizations.infrastructure(session, claimed.target_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        return None
    organization = infrastructure.organization

    # Apply idempotent SDK migrations before updating Platform-owned user rows.
    db = Postgres(
        infrastructure.database.host,
        infrastructure.database.port,
        infrastructure.database.username,
        infrastructure.database.password,
        infrastructure.database.sslmode,
    )
    await db.prepare_organization_database(organization.id)
    async with session_scope() as session:
        await organizations.sync_users(session, organization.id, db)

    # Converge the Organization bucket before Applications receive scoped credentials.
    object_storage = Exoscale(
        infrastructure.storage.endpoint_url,
        infrastructure.storage.access_key_id,
        infrastructure.storage.secret_access_key,
    )
    await object_storage.create(organization.id.hex)

    # Apply release changes to the Organization Namespace, quota, and ingress policy.
    cluster = Kubernetes(infrastructure.compute.kubeconfig)
    await cluster.organizations.apply(organization.id.hex)

    # Publish the Organization after its provider and Kubernetes boundaries are ready.
    async with session_scope() as session:
        await organizations.mark_running(session, organization.id)
        await session.commit()


async def delete(claimed: Operation) -> str | None:
    """Remove one Organization's routes, Applications, Namespace, providers, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        infrastructure = await organizations.infrastructure(session, claimed.target_id)
    if infrastructure is None:
        return None
    organization = infrastructure.organization
    if organization.deleted_at is None:
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
        application_ids_result = await session.scalars(select(Application.id).where(Application.organization_id == organization.id))
        application_ids = application_ids_result.all()
    await cluster.organizations.delete(organization.id.hex)
    for application_id in application_ids:
        await db.delete_schema(organization.id, application_id)
        await object_storage.revoke(application_id.hex)

    await db.delete_database(organization.id)
    await object_storage.delete(organization.id.hex)
    async with session_scope() as session:
        for application_id in application_ids:
            await applications.purge(session, application_id)
        await organizations.purge(session, organization.id)
        await session.commit()
