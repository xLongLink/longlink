import secrets
from src import adapters
from src.utils import jobs
from src.operations import computes
from src.utils.jobs import operation
from src.environments import env
from src.models.statuses import Status
from src.database.services import compute, storage, database, applications, organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute
from src.models.infrastructure import exoscale_zone
from src.kubernetes.applications import DesiredApplication
from src.database.models.operations import Operation


@operation("application.create")
async def create(claimed: Operation) -> jobs.OperationOutcome:
    """Provision and deploy one Application once, then publish its gateway route."""

    # Reject work when the claimed replica no longer matches the Operation's Platform release.
    if claimed.platform_version != env.VERSION:
        return jobs.fail("Operation targets a different Platform release")

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None or application.deleted_at is not None:
        return jobs.complete()

    # A new create execution makes a previously failed Application visibly active again.
    if application.status == Status.failed:
        if not await applications.set_status(application.id, Status.failed, Status.creating):
            current = await applications.get(application.id, include_deleted=True)
            if current is None or current.deleted_at is not None or current.status == Status.running:
                return jobs.complete()
            return jobs.wait("Application lifecycle state changed before creation")
        application.status = Status.creating
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        await applications.set_status(application.id, application.status, Status.failed)
        return jobs.fail("Application Organization not found")
    registry = await compute.get(organization.compute_id)
    if registry is None:
        await applications.set_status(application.id, application.status, Status.failed)
        return jobs.fail("Compute registry not found")

    cluster = Kubernetes(registry.kubeconfig)

    try:
        # A waiting cycle after deployment reached running state skips workload deployment.
        if application.status == Status.creating:
            # Every Application entering provisioning must already have immutable image metadata.
            if application.digest is None:
                await applications.set_status(application.id, Status.creating, Status.failed)
                return jobs.fail("Application image metadata is unavailable")

            # Resolve the Application's immutable provider assignments.
            database_registry = await database.get(organization.database_id)
            if database_registry is None:
                await applications.set_status(application.id, Status.creating, Status.failed)
                return jobs.fail("Database registry not found")
            storage_registry = await storage.get(organization.storage_id)
            if storage_registry is None:
                await applications.set_status(application.id, Status.creating, Status.failed)
                return jobs.fail("Storage registry not found")
            db = adapters.Postgres(
                database_registry.host,
                database_registry.port,
                database_registry.username,
                database_registry.password,
                database_registry.sslmode,
            )
            object_storage = adapters.storage(storage_registry)

            # Resolve the cluster-owned credentials before converging provider identities.
            bucket = organization.id.hex
            prefix = f"applications/{application.id.hex}/"
            await object_storage.create_prefix(bucket, prefix)
            try:
                persisted_runtime_envs = await cluster.applications.read_runtime_envs(application.id, organization.slug)
            except (TypeError, ValueError):
                await applications.set_status(application.id, Status.creating, Status.failed)
                return jobs.fail("Application runtime Secret is invalid")

            # Generate credentials only until the runtime Secret commits their durable values.
            if persisted_runtime_envs is None:
                database_password = secrets.token_urlsafe(24)
                connection = await db.schema(organization.id, application.id, database_password)
                credentials = await object_storage.credentials(claimed.target_id.hex, bucket, ("shared/",), prefix)
            else:
                database_password = persisted_runtime_envs.get("LONGLINK_DATABASE_PASSWORD")
                storage_access_key_id = persisted_runtime_envs.get("LONGLINK_STORAGE_USERNAME")
                storage_secret_access_key = persisted_runtime_envs.get("LONGLINK_STORAGE_PASSWORD")
                if not database_password or not storage_access_key_id or not storage_secret_access_key:
                    await applications.set_status(application.id, Status.creating, Status.failed)
                    return jobs.fail("Application runtime Secret is invalid")
                connection = await db.schema(organization.id, application.id, database_password)
                credentials = {
                    "access_key_id": storage_access_key_id,
                    "secret_access_key": storage_secret_access_key,
                }

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
                await applications.set_status(application.id, Status.creating, Status.failed)
                return jobs.fail("Application runtime Secret is invalid")

            # Commit newly generated credentials before creating a workload that can consume them.
            if persisted_runtime_envs is None:
                await cluster.applications.stage_runtime_envs(application.id, organization.slug, runtime_envs)

            # Reapply both workload resources on every retry so creation repairs partial cluster state.
            await cluster.applications.apply(
                DesiredApplication(
                    id=application.id,
                    namespace=organization.slug,
                    image=application.image,
                )
            )

            # Wait within this execution while Kubernetes advances the Application rollout.
            if not await cluster.applications.ready(application.id, organization.slug):
                return jobs.wait("Application workload is still starting")
        elif application.status != Status.running:
            return jobs.complete()

        # Publish a creating Application route inline without exposing running before gateway readiness.
        pending_route = GatewayRoute(id=application.id, namespace=organization.slug) if application.status == Status.creating else None
        result = await computes.reconcile_gateway(registry, cluster, pending_route)
        if not result.ready:
            return jobs.wait("Gateway is still converging")
        if not await compute.record_success(
            registry.id,
            claimed.platform_version,
            result.gateway_url,
            registry.status,
            satisfy_pending=True,
        ):
            return jobs.wait("Application gateway state was not recorded")

        # Publish running only after both workload readiness and gateway publication succeed.
        if application.status == Status.creating and await applications.mark_running(application.id, organization.compute_id) is None:
            current = await applications.get(application.id, include_deleted=True)
            if current is None or current.deleted_at is not None or current.status == Status.running:
                return jobs.complete()
            return jobs.wait("Application lifecycle state changed before readiness was recorded")
        return jobs.complete()
    except Exception:
        # Unexpected provisioning errors make both the lifecycle target and its one Operation terminal.
        await applications.set_status(application.id, application.status, Status.failed)
        raise


@operation("application.delete")
async def delete(claimed: Operation) -> jobs.OperationOutcome:
    """Remove one Application route, runtime, provider state, and tombstone."""

    # Reject work when the claimed replica no longer matches the Operation's Platform release.
    if claimed.platform_version != env.VERSION:
        return jobs.fail("Operation targets a different Platform release")

    # An absent tombstone means a previous execution completed cleanup.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None:
        return jobs.complete()
    if application.deleted_at is None:
        return jobs.fail("Active Applications cannot be deleted by lifecycle cleanup")
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None:
        return jobs.fail("Application Organization not found")
    registry = await compute.get(organization.compute_id)
    if registry is None:
        return jobs.fail("Compute registry not found")
    database_registry = await database.get(organization.database_id)
    storage_registry = await storage.get(organization.storage_id)
    if database_registry is None or storage_registry is None:
        return jobs.fail("Application provider registry not found")
    cluster = Kubernetes(registry.kubeconfig)

    # Remove the gateway route and await rollout before terminating the backend Service and Pods.
    result = await computes.reconcile_gateway(registry, cluster)
    if not result.ready:
        return jobs.wait("Gateway is still converging")
    if not await cluster.applications.delete(application.id, organization.slug):
        return jobs.wait("Application resources are still terminating")

    # Provider credentials remain available until Kubernetes confirms no Pod can use them.
    db = adapters.Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    object_storage = adapters.storage(storage_registry)
    await db.delete_schema(organization.id, application.id)
    await object_storage.revoke(application.id.hex)
    await object_storage.delete_prefix(organization.id.hex, f"applications/{application.id.hex}/")
    if not await compute.record_success(
        registry.id,
        claimed.platform_version,
        result.gateway_url,
        registry.status,
    ):
        return jobs.wait("Application gateway state was not recorded")
    await applications.purge(application.id)
    return jobs.complete()
