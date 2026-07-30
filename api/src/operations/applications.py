import secrets
from src.operations import computes
from src.environments import env
from src.models.statuses import Status
from src.adapters.postgres import Postgres
from src.database.services import compute, operations, applications, organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute
from src.adapters.storage.exoscale import Exoscale
from src.database.models.operations import Operation


async def create(claimed: Operation) -> str | None:
    """Converge one Application lifecycle target or running workload."""

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None or application.deleted_at is not None:
        return None

    # A new create execution makes a previously failed Application visibly active again.
    if application.status == Status.failed:
        if not await applications.set_status(application.id, Status.failed, Status.creating):
            return None
        application.status = Status.creating
    infrastructure = await organizations.infrastructure(application.organization_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        return "Application Organization not found"
    organization = infrastructure.organization
    registry = infrastructure.compute

    cluster = Kubernetes(registry.kubeconfig)

    # Converge providers and the workload while the Application remains in creation.
    if application.status == Status.creating:
        # Resolve the Application's immutable provider assignments.
        database_registry = infrastructure.database
        storage_registry = infrastructure.storage
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

        # Generate fresh credentials for this explicit creation attempt.
        bucket = organization.id.hex
        prefix = f"applications/{application.id.hex}/"
        await object_storage.create_prefix(bucket, prefix)
        database_password = secrets.token_urlsafe(24)
        credentials = await object_storage.credentials(claimed.target_id.hex, bucket, ("shared/",), prefix)

        connection = await db.schema(organization.id, application.id, database_password)

        # Build the complete immutable runtime contract from provider and Application identities.
        runtime_envs = {
            "LONGLINK_ENV": "production",
            "LONGLINK_DATABASE_HOST": connection["host"],
            "LONGLINK_DATABASE_NAME": connection["database_name"],
            "LONGLINK_DATABASE_PASSWORD": connection["password"],
            "LONGLINK_DATABASE_PORT": str(connection["port"]),
            "LONGLINK_DATABASE_SCHEMA": application.id.hex,
            "LONGLINK_DATABASE_SSLMODE": connection["sslmode"].value,
            "LONGLINK_DATABASE_USERNAME": connection["username"],
            "LONGLINK_STORAGE_BUCKET": bucket,
            "LONGLINK_STORAGE_ENDPOINT_URL": storage_registry.endpoint_url,
            "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
            "LONGLINK_STORAGE_PREFIX": prefix,
            "LONGLINK_STORAGE_REGION": object_storage.region,
            "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
            "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
        }

        # Commit the generated runtime values before creating a workload that can consume them.
        await cluster.applications.stage_runtime_envs(application.id, organization.slug, runtime_envs)

    elif application.status != Status.running:
        return None

    # Reapply the workload so creation retries and release reconciliation repair deployment drift.
    await cluster.applications.apply(application.id, organization.slug, application.image)

    # Running Application reconciliation owns only its workload, not shared gateway state.
    if application.status == Status.running:
        return None

    # Publish a creating Application route inline without exposing running before gateway readiness.
    gateway_url = await computes.reconcile_gateway(registry, cluster, GatewayRoute(id=application.id, namespace=organization.slug))
    if not await compute.record_success(
        registry.id,
        env.VERSION,
        gateway_url,
        registry.status,
        satisfy_pending=True,
    ):
        return "Application gateway state was not recorded"

    # Publish running only after both workload readiness and gateway publication succeed.
    if not await applications.mark_running(application.id):
        return None
    await operations.create(organization.compute_id)
    return None


async def delete(claimed: Operation) -> str | None:
    """Remove one Application route, runtime, provider state, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None:
        return None
    if application.deleted_at is None:
        return "Active Applications cannot be deleted by lifecycle cleanup"
    infrastructure = await organizations.infrastructure(application.organization_id)
    if infrastructure is None:
        return "Application Organization not found"
    organization = infrastructure.organization
    registry = infrastructure.compute
    database_registry = infrastructure.database
    storage_registry = infrastructure.storage
    cluster = Kubernetes(registry.kubeconfig)

    # Remove the gateway route and await rollout before terminating the backend Service and Pods.
    gateway_url = await computes.reconcile_gateway(registry, cluster)
    await cluster.applications.delete(application.id, organization.slug)

    # Provider credentials remain available until Kubernetes confirms no Pod can use them.
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
    await db.delete_schema(organization.id, application.id)
    await object_storage.revoke(application.id.hex)
    await object_storage.delete_prefix(organization.id.hex, f"applications/{application.id.hex}/")
    if not await compute.record_success(
        registry.id,
        env.VERSION,
        gateway_url,
        registry.status,
    ):
        return "Application gateway state was not recorded"
    await applications.purge(application.id)
    return None
