from src import adapters
from src.utils import jobs
from src.operations import computes
from src.utils.jobs import operation
from longlink.shared import users as shared_users
from src.models.statuses import OrganizationStatus
from src.database.services import compute, storage, database, applications, organizations
from src.kubernetes.client import Kubernetes
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def sync_users(organization: Organization) -> None:
    """Seed the Organization shared schema from Platform-owned users and memberships."""

    # Read deleted memberships too so deactivations propagate into the shared schema.
    memberships = await organizations.members(organization.id, include_deleted=True)
    users: list[shared_users.UserRow] = []

    # Convert Platform identities and membership state at the shared-schema boundary.
    for membership in memberships:
        user = membership.user
        deleted_at = user.deleted_at
        if membership.deleted_at is not None and (deleted_at is None or membership.deleted_at > deleted_at):
            deleted_at = membership.deleted_at
        updated_at = max(user.updated_at, membership.updated_at)
        if deleted_at is not None and deleted_at > updated_at:
            updated_at = deleted_at
        users.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "avatar": user.avatar,
                "role": membership.role.value,
                "created_at": membership.created_at,
                "updated_at": updated_at,
                "deleted_at": deleted_at,
            }
        )

    # The Platform is authoritative and Applications receive read-only access.
    await shared_users.sync_url(organization.shared_schema_url, users)


@operation("organization.create")
async def create(claimed: Operation) -> jobs.OperationOutcome:
    """Create one Organization database, shared schema, initial users, and shared storage."""

    # Ignore removed or already-running Organizations.
    organization = await organizations.get(claimed.target_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        return jobs.complete()
    if organization.status == OrganizationStatus.running:
        return jobs.complete()

    # Resolve the immutable database and storage assignments selected at creation.
    database_registry = await database.get(organization.database_id)
    if database_registry is None:
        return jobs.fail("Database registry not found")
    storage_registry = await storage.get(organization.storage_id)
    if storage_registry is None:
        return jobs.fail("Storage registry not found")
    compute_registry = await compute.get(organization.compute_id)
    if compute_registry is None:
        return jobs.fail("Compute registry not found")

    # Create the database, apply shared-schema migrations, and seed the initial users.
    db = adapters.Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    await db.prepare_organization_database(organization.id, organization.shared_schema_url)
    await sync_users(organization)

    # Initialize shared storage before Applications can be created for the Organization.
    object_storage = adapters.storage(storage_registry)
    bucket = organization.id.hex
    await object_storage.create(bucket)
    await object_storage.create_prefix(bucket, "shared/")

    # Install the Organization Namespace exactly once as part of its creation lifecycle.
    cluster = Kubernetes(compute_registry.kubeconfig)
    await cluster.organizations.apply(organization.slug)

    # Publish readiness only after every initial Organization dependency and boundary exists.
    await organizations.set_runtime(organization.id, OrganizationStatus.running)
    return jobs.complete()


@operation("organization.reconcile")
async def reconcile(claimed: Operation) -> jobs.OperationOutcome:
    """Reconcile one Organization's shared database and storage resources."""

    # Skip reconciliation for removed Organizations.
    organization = await organizations.get(claimed.target_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        return jobs.complete()

    # Resolve the Organization's immutable database and storage assignments.
    database_registry = await database.get(organization.database_id)
    if database_registry is None:
        return jobs.fail("Database registry not found")
    storage_registry = await storage.get(organization.storage_id)
    if storage_registry is None:
        return jobs.fail("Storage registry not found")

    # Apply idempotent SDK migrations before updating Platform-owned user rows.
    db = adapters.Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    await db.prepare_organization_database(organization.id, organization.shared_schema_url)
    await sync_users(organization)

    # Converge the Organization bucket and shared folder marker in the same reconciliation.
    object_storage = adapters.storage(storage_registry)
    bucket = organization.id.hex
    await object_storage.create(bucket)
    await object_storage.create_prefix(bucket, "shared/")
    return jobs.complete()


@operation("organization.delete")
async def delete(claimed: Operation) -> jobs.OperationOutcome:
    """Remove one Organization's routes, Applications, Namespace, providers, and tombstone."""

    # An absent tombstone means a previous attempt completed cleanup.
    organization = await organizations.get(claimed.target_id, include_deleted=True)
    if organization is None:
        return jobs.complete()
    if organization.deleted_at is None:
        return jobs.fail("Active Organizations cannot be deleted by lifecycle cleanup")
    compute_registry = await compute.get(organization.compute_id)
    if compute_registry is None:
        return jobs.fail("Compute registry not found")
    database_registry = await database.get(organization.database_id)
    storage_registry = await storage.get(organization.storage_id)
    if database_registry is None or storage_registry is None:
        return jobs.fail("Organization provider registry not found")
    cluster = Kubernetes(compute_registry.kubeconfig)

    # Remove every Organization route before terminating any child Application Service.
    gateway_result = await computes.reconcile_gateway(compute_registry, cluster)
    if not gateway_result.ready:
        return jobs.retry("Gateway is still converging")
    db = adapters.Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    object_storage = adapters.storage(storage_registry)
    application_rows = await organizations.applications(organization.id, include_deleted=True)
    for application in application_rows:
        if not await cluster.applications.delete(
            application.id,
            organization.slug,
        ):
            return jobs.retry("Organization Application resources are still terminating")
        await db.delete_schema(organization.id, application.id)
        await object_storage.revoke(application.id.hex)
        await object_storage.delete_prefix(
            organization.id.hex,
            f"applications/{application.id.hex}/",
        )
        await applications.purge(application.id)

    # Delete the known Organization Namespace only after all child workloads terminate.
    if not await cluster.organizations.delete(organization.slug):
        return jobs.retry("Organization Namespace is still terminating")
    await db.delete_database(organization.id)
    await object_storage.delete(organization.id.hex)
    if not await compute.record_success(
        compute_registry.id,
        claimed.platform_version,
        gateway_result.gateway_url,
    ):
        return jobs.retry("Organization gateway state was not recorded")
    await organizations.purge(organization.id)
    return jobs.complete()
