from src.models.statuses import Status
from src.adapters.postgres import Postgres
from src.database.services import applications, organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.operations import Operation


async def reconcile(claimed: Operation) -> str | None:
    """Converge one Organization's shared providers and Kubernetes boundary."""

    # Skip removed Organizations.
    infrastructure = await organizations.infrastructure(claimed.target_id)
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
    await organizations.sync_users(organization.id, db)

    # Converge the Organization bucket before Applications receive scoped credentials.
    object_storage = Exoscale(
        storage_registry.endpoint_url,
        storage_registry.access_key_id,
        storage_registry.secret_access_key,
    )
    bucket = organization.id.hex
    await object_storage.create(bucket)

    # Apply release changes to the Organization Namespace and NetworkPolicy.
    cluster = Kubernetes(compute_registry.kubeconfig)
    await cluster.organizations.apply(organization.id.hex)

    # Publish the Organization after its provider and Kubernetes boundaries are ready.
    if organization.status == Status.creating:
        if not await organizations.set_runtime(organization.id, Status.creating, Status.running):
            return None
    return None


async def delete(claimed: Operation) -> str | None:
    """Remove one Organization's routes, Applications, Namespace, providers, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    infrastructure = await organizations.infrastructure(claimed.target_id)
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
    application_rows = await organizations.applications(organization.id, include_deleted=True)
    await cluster.organizations.delete(organization.id.hex)
    for application in application_rows:
        await db.delete_schema(organization.id, application.id)
        await object_storage.revoke(application.id.hex)
        await applications.purge(application.id)

    await db.delete_database(organization.id)
    await object_storage.delete(organization.id.hex)
    await organizations.purge(organization.id)
    return None
