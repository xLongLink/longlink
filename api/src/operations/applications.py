from src import adapters
from typing import cast
from src.utils import jobs, names, images
from src.operations import computes
from src.utils.jobs import operation
from src.environments import env
from src.models.types import Image
from src.models.statuses import ApplicationStatus
from src.adapters.postgres import DatabaseRuntimeConnection
from src.database.services import compute, storage, database, applications, organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.base import StorageRuntimeCredentials
from src.models.infrastructure import exoscale_zone
from src.kubernetes.applications import DesiredApplication
from src.database.models.storages import StorageRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


def runtime_environment(
    application: Application,
    organization: Organization,
    connection: DatabaseRuntimeConnection,
    storage_registry: StorageRegistry,
    credentials: StorageRuntimeCredentials,
) -> dict[str, str]:
    """Build one Application's exact runtime environment from persisted provider identities."""

    bucket = names.organization_bucket(organization.id)
    prefix = names.application_storage_prefix(application.id)
    return {
        **application.envs,
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": connection["host"],
        "LONGLINK_DATABASE_NAME": connection["database_name"],
        "LONGLINK_DATABASE_PASSWORD": connection["password"],
        "LONGLINK_DATABASE_PORT": str(connection["port"]),
        "LONGLINK_DATABASE_SCHEMA": application.id.hex,
        "LONGLINK_DATABASE_SSLMODE": connection["sslmode"],
        "LONGLINK_DATABASE_USERNAME": connection["username"],
        "LONGLINK_STORAGE_BUCKET": bucket,
        "LONGLINK_STORAGE_ENDPOINT_URL": storage_registry.runtime_endpoint_url,
        "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
        "LONGLINK_STORAGE_PREFIX": prefix,
        "LONGLINK_STORAGE_REGION": exoscale_zone(storage_registry.runtime_endpoint_url),
        "LONGLINK_STORAGE_SHARED_PREFIX": names.shared_storage_prefix(),
        "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
    }


@operation("application.create")
async def create(claimed: Operation) -> jobs.OperationOutcome:
    """Provision and deploy one Application once, then publish its gateway route."""

    if claimed.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None or application.deleted_at is not None:
        return jobs.complete()
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        return jobs.fail("Application Organization not found")
    if organization.compute_id != claimed.compute_id:
        return jobs.fail("Application does not match operation compute")
    registry = await compute.get(claimed.compute_id, include_deleted=True)
    if registry is None or registry.deleted_at is not None:
        return jobs.fail("Compute registry not found")

    cluster = Kubernetes(registry.kubeconfig)

    # A retry after deployment reached running state skips workload deployment.
    if application.status == ApplicationStatus.creating:
        database_registry = await database.get(organization.database_id, include_deleted=True)
        if database_registry is None:
            return jobs.fail("Database registry not found")
        storage_registry = await storage.get(organization.storage_id, include_deleted=True)
        if storage_registry is None:
            return jobs.fail("Storage registry not found")
        db = adapters.Postgres(
            database_registry.host,
            database_registry.port,
            database_registry.username,
            database_registry.password,
            database_registry.sslmode,
        )
        object_storage = adapters.storage(storage_registry)

        # Resolve and persist the immutable image before creating provider credentials.
        if application.digest is None:
            metadata = await images.metadata(Image(application.image), application.envs)
            if metadata is None:
                await applications.set_status(application.id, ApplicationStatus.failed)
                return jobs.complete()
            updated = await applications.update_runtime(
                application.id,
                image=cast(str, metadata.image),
                sdk=metadata.sdk,
                digest=metadata.digest,
                version=metadata.version,
                description=application.description,
                icon=application.icon,
                envs=application.envs,
                user=None,
            )
            if updated is None:
                return jobs.complete()
            application = updated

        # Provision stable database and storage identities before constructing the runtime Secret.
        connection = await db.schema(organization.id, application.id, application.database_password)
        bucket = names.organization_bucket(organization.id)
        prefix = names.application_storage_prefix(application.id)
        await object_storage.create_prefix(bucket, prefix)
        credentials = applications.storage_credentials(application)
        if credentials is None:
            application_key = application.id.hex
            provisioned = await applications.provision_storage_credentials(
                application.id,
                lambda: object_storage.credentials(application_key, bucket, (names.shared_storage_prefix(),), prefix),
                lambda generated: object_storage.discard(generated["access_key_id"]),
            )
            if provisioned is None:
                return jobs.complete()
            application, credentials = provisioned
        runtime_env = runtime_environment(application, organization, connection, storage_registry, credentials)

        # Deployment is an explicit lifecycle action and is never called by compute reconciliation or releases.
        await cluster.applications.apply(
            DesiredApplication(
                id=application.id,
                organization_id=organization.id,
                namespace=organization.slug,
                image=application.image,
                envs=runtime_env,
            ),
            str(registry.id),
            registry.proxy_secret,
            claimed.platform_version,
        )
        try:
            await cluster.applications.wait_ready(str(application.id), organization.slug)
        except TimeoutError:
            if claimed.attempt_count < jobs.OPERATION_ATTEMPT_LIMIT:
                return jobs.retry("Application workload is still starting")
            await applications.set_status(application.id, ApplicationStatus.failed)
            return jobs.fail("Application workload did not become ready")
    elif application.status != ApplicationStatus.running:
        return jobs.complete()

    # Commit readiness with an independent full-budget gateway recovery entry before inline publication.
    queued = await applications.mark_running(application.id, claimed.compute_id)
    if queued is None:
        return jobs.complete()

    # Complete lifecycle work only after the route is published; queued compute work recovers crash windows.
    result = await computes.reconcile_gateway(registry, cluster)
    if not await computes.record_gateway(claimed, registry, result):
        return jobs.retry("Application gateway state was not recorded")
    return jobs.complete()


@operation("application.delete")
async def delete(claimed: Operation) -> jobs.OperationOutcome:
    """Remove one Application route, runtime, provider state, and tombstone."""

    if claimed.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")

    # An absent tombstone means a previous attempt completed cleanup.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None:
        return jobs.complete()
    if application.deleted_at is None:
        return jobs.fail("Active Applications cannot be deleted by lifecycle cleanup")
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None or organization.compute_id != claimed.compute_id:
        return jobs.fail("Application Organization not found")
    registry = await compute.get(claimed.compute_id, include_deleted=True)
    if registry is None:
        return jobs.fail("Compute registry not found")
    database_registry = await database.get(organization.database_id, include_deleted=True)
    storage_registry = await storage.get(organization.storage_id, include_deleted=True)
    if database_registry is None or storage_registry is None:
        return jobs.fail("Application provider registry not found")
    cluster = Kubernetes(registry.kubeconfig)

    # Remove the gateway route and await rollout before terminating the backend Service and Pods.
    result = await computes.reconcile_gateway(registry, cluster)
    await cluster.applications.delete(application.id, organization.id, organization.slug, str(registry.id))

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
    await object_storage.delete_prefix(names.organization_bucket(organization.id), names.application_storage_prefix(application.id))
    if not await computes.record_gateway(claimed, registry, result):
        return jobs.retry("Application gateway state was not recorded")
    await applications.purge(application.id)
    return jobs.complete()
