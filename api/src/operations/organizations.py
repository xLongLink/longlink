from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import applications, organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.operations import Operation


async def reconcile(claimed: Operation) -> str | None:
    """Converge one Organization's shared providers and Kubernetes boundary."""

    # Skip removed Organizations.
    async with session_scope() as session:
        infrastructure = await organizations.infrastructure(session, claimed.target_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        return None
    organization = infrastructure.organization

    # Resolve the Organization's immutable provider and compute assignments.
    database_registry = infrastructure.database
    storage_registry = infrastructure.storage
    compute_registry = infrastructure.compute

    # Apply idempotent SDK migrations before updating Platform-owned user rows.
    db = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    await db.prepare_organization_database(organization.id)
    async with session_scope() as session:
        await organizations.sync_users(session, organization.id, db)

    # Converge the Organization bucket before Applications receive scoped credentials.
    object_storage = Exoscale(
        storage_registry.endpoint_url,
        storage_registry.access_key_id,
        storage_registry.secret_access_key,
    )
    await object_storage.create(organization.id.hex)

    # Apply release changes to the Organization Namespace, quota, and ingress policy.
    cluster = Kubernetes(compute_registry.kubeconfig)
    await cluster.organizations.apply(organization.id.hex)

    # Publish the Organization after its provider and Kubernetes boundaries are ready.
    async with session_scope() as session:
        await organizations.set_runtime(session, organization.id, Status.creating, Status.running)
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
    compute_registry = infrastructure.compute
    database_registry = infrastructure.database
    storage_registry = infrastructure.storage
    cluster = Kubernetes(compute_registry.kubeconfig)

    db = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    object_storage = Exoscale(
        storage_registry.endpoint_url,
        storage_registry.access_key_id,
        storage_registry.secret_access_key,
    )

    # Namespace deletion cascades every Application Kubernetes resource and waits for all Pods to terminate.
    async with session_scope() as session:
        application_rows = await organizations.applications(session, organization.id, include_deleted=True)
    await cluster.organizations.delete(organization.id.hex)
    for application in application_rows:
        await db.delete_schema(organization.id, application.id)
        await object_storage.revoke(application.id.hex)

    await db.delete_database(organization.id)
    await object_storage.delete(organization.id.hex)
    async with session_scope() as session:
        for application in application_rows:
            await applications.purge(session, application.id)
        await organizations.purge(session, organization.id)
        await session.commit()
