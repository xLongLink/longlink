from src import adapters
from src.operations import computes
from longlink.shared import users as shared_users
from src.environments import env
from src.models.statuses import Status
from src.database.services import compute, applications, organizations
from src.kubernetes.client import Kubernetes
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def sync_users(organization: Organization, db: adapters.Postgres) -> None:
    """Seed the Organization shared schema from Platform-owned users and memberships."""

    # Read deleted memberships too so deactivations propagate into the shared schema.
    memberships = await organizations.members(organization.id, include_deleted=True)
    users: list[shared_users.UserRow] = []

    # Convert Platform identities and membership state at the shared-schema boundary.
    for membership in memberships:
        user = membership.user
        deleted_at = max((item for item in (user.deleted_at, membership.deleted_at) if item is not None), default=None)
        updated_at = max(user.updated_at, membership.updated_at, deleted_at or user.updated_at)
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
    await shared_users.sync_url(db.shared_schema_url(organization.id), users)


async def reconcile(claimed: Operation) -> str | None:
    """Converge one Organization's shared providers and Kubernetes boundary."""

    # Skip removed Organizations.
    infrastructure = await organizations.infrastructure(claimed.target_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        return None
    organization = infrastructure.organization

    # A new execution makes a previously failed Organization visibly active again.
    if organization.status == Status.failed:
        if not await organizations.set_runtime(organization.id, Status.failed, Status.creating):
            return None
        organization.status = Status.creating

    # Resolve the Organization's immutable provider and compute assignments.
    database_registry = infrastructure.database
    storage_registry = infrastructure.storage
    compute_registry = infrastructure.compute

    # Apply idempotent SDK migrations before updating Platform-owned user rows.
    db = adapters.Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    await db.prepare_organization_database(organization.id)
    await sync_users(organization, db)

    # Converge the Organization bucket and shared folder marker in the same reconciliation.
    object_storage = adapters.Exoscale(
        storage_registry.endpoint_url,
        storage_registry.access_key_id,
        storage_registry.secret_access_key,
    )
    bucket = organization.id.hex
    await object_storage.create(bucket)
    await object_storage.create_prefix(bucket, "shared/")

    # Apply release changes to the Organization Namespace and NetworkPolicy.
    cluster = Kubernetes(compute_registry.kubeconfig)
    await cluster.organizations.apply(organization.slug)

    # Restore running after successful reconciliation of a failed Organization.
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

    # Remove every Organization route before terminating any child Application Service.
    gateway_url = await computes.reconcile_gateway(compute_registry, cluster)
    db = adapters.Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    object_storage = adapters.Exoscale(
        storage_registry.endpoint_url,
        storage_registry.access_key_id,
        storage_registry.secret_access_key,
    )
    application_rows = await organizations.applications(organization.id, include_deleted=True)
    for application in application_rows:
        await cluster.applications.delete(application.id, organization.slug)
        await db.delete_schema(organization.id, application.id)
        await object_storage.revoke(application.id.hex)
        await object_storage.delete_prefix(
            organization.id.hex,
            f"applications/{application.id.hex}/",
        )
        await applications.purge(application.id)

    # Delete the known Organization Namespace only after all child workloads terminate.
    await cluster.organizations.delete(organization.slug)
    await db.delete_database(organization.id)
    await object_storage.delete(organization.id.hex)
    if not await compute.record_success(
        compute_registry.id,
        env.VERSION,
        gateway_url,
        compute_registry.status,
    ):
        return "Organization gateway state was not recorded"
    await organizations.purge(organization.id)
    return None
