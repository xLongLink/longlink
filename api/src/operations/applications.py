import secrets
from src import adapters
from src.utils import jobs
from src.operations import computes
from src.utils.jobs import operation
from src.environments import env
from src.models.statuses import Status
from src.database.services import compute, applications, organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute
from src.models.infrastructure import exoscale_zone
from src.database.models.operations import Operation


@operation("application.create")
async def create(claimed: Operation) -> str | None:
    """Provision and deploy one Application once, then publish its gateway route."""

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None or application.deleted_at is not None:
        return None

    # A new create execution makes a previously failed Application visibly active again.
    if application.status == Status.failed:
        if not await applications.set_status(application.id, Status.failed, Status.creating):
            current = await applications.get(application.id, include_deleted=True)
            if current is None or current.deleted_at is not None or current.status == Status.running:
                return None
            return "Application lifecycle state changed before creation"
        application.status = Status.creating
    infrastructure = await organizations.infrastructure(application.organization_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        return "Application Organization not found"
    organization = infrastructure.organization
    registry = infrastructure.compute
    if registry is None:
        return "Compute registry not found"

    cluster = Kubernetes(registry.kubeconfig)

    # Converge providers and the workload while the Application remains in creation.
    if application.status == Status.creating:
        # Resolve the Application's immutable provider assignments.
        database_registry = infrastructure.database
        if database_registry is None:
            return "Database registry not found"
        storage_registry = infrastructure.storage
        if storage_registry is None:
            return "Storage registry not found"
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

        # Resolve the cluster-owned credentials before converging provider identities.
        bucket = organization.id.hex
        prefix = f"applications/{application.id.hex}/"
        await object_storage.create_prefix(bucket, prefix)
        try:
            persisted_runtime_envs = await cluster.applications.read_runtime_envs(application.id, organization.slug)
        except (TypeError, ValueError):
            return "Application runtime Secret is invalid"

        # Generate credentials only until the runtime Secret commits their durable values.
        if persisted_runtime_envs is None:
            database_password = secrets.token_urlsafe(24)
            credentials = await object_storage.credentials(claimed.target_id.hex, bucket, ("shared/",), prefix)
        else:
            database_password = persisted_runtime_envs.get("LONGLINK_DATABASE_PASSWORD")
            storage_access_key_id = persisted_runtime_envs.get("LONGLINK_STORAGE_USERNAME")
            storage_secret_access_key = persisted_runtime_envs.get("LONGLINK_STORAGE_PASSWORD")
            if not database_password or not storage_access_key_id or not storage_secret_access_key:
                return "Application runtime Secret is invalid"
            credentials = {
                "access_key_id": storage_access_key_id,
                "secret_access_key": storage_secret_access_key,
            }

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
            "LONGLINK_STORAGE_REGION": exoscale_zone(storage_registry.endpoint_url),
            "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
            "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
        }

        # Existing runtime values are immutable during creation and must match the expected contract exactly.
        if persisted_runtime_envs is not None and persisted_runtime_envs != runtime_envs:
            return "Application runtime Secret is invalid"

        # Commit newly generated credentials before creating a workload that can consume them.
        if persisted_runtime_envs is None:
            await cluster.applications.stage_runtime_envs(application.id, organization.slug, runtime_envs)

        # Reapply both workload resources on every retry so creation repairs partial cluster state.
        await cluster.applications.apply(application.id, organization.slug, application.image)
    elif application.status != Status.running:
        return None

    # Publish a creating Application route inline without exposing running before gateway readiness.
    pending_route = GatewayRoute(id=application.id, namespace=organization.slug) if application.status == Status.creating else None
    gateway_url = await computes.reconcile_gateway(registry, cluster, pending_route)
    if not await compute.record_success(
        registry.id,
        env.VERSION,
        gateway_url,
        registry.status,
        satisfy_pending=True,
    ):
        return "Application gateway state was not recorded"

    # Publish running only after both workload readiness and gateway publication succeed.
    if application.status == Status.creating and not await applications.mark_running(application.id, organization.compute_id):
        current = await applications.get(application.id, include_deleted=True)
        if current is None or current.deleted_at is not None or current.status == Status.running:
            return None
        return "Application lifecycle state changed before readiness was recorded"
    return None


@operation("application.delete")
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
    if registry is None:
        return "Compute registry not found"
    database_registry = infrastructure.database
    storage_registry = infrastructure.storage
    if database_registry is None or storage_registry is None:
        return "Application provider registry not found"
    cluster = Kubernetes(registry.kubeconfig)

    # Remove the gateway route and await rollout before terminating the backend Service and Pods.
    gateway_url = await computes.reconcile_gateway(registry, cluster)
    await cluster.applications.delete(application.id, organization.slug)

    # Provider credentials remain available until Kubernetes confirms no Pod can use them.
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
