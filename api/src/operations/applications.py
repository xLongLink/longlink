from src import adapters
from src.utils import jobs, images
from src.operations import computes
from src.utils.jobs import operation
from src.environments import env
from src.models.types import Image
from src.models.statuses import ApplicationStatus
from src.database.services import compute, storage, database, applications, organizations
from src.kubernetes.client import Kubernetes
from src.models.applications import ApplicationEnvironment
from src.models.infrastructure import exoscale_zone
from src.kubernetes.applications import DesiredApplication
from src.database.models.operations import Operation


@operation("application.create")
async def create(claimed: Operation) -> jobs.OperationOutcome:
    """Provision and deploy one Application once, then publish its gateway route."""

    # Defer lifecycle work until the replica matches the Operation's Platform release.
    if claimed.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    application = await applications.get(claimed.target_id, include_deleted=True)
    if application is None or application.deleted_at is not None:
        return jobs.complete()
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        return jobs.fail("Application Organization not found")
    registry = await compute.get(organization.compute_id)
    if registry is None:
        return jobs.fail("Compute registry not found")

    cluster = Kubernetes(registry.kubeconfig)

    # A retry after deployment reached running state skips workload deployment.
    if application.status == ApplicationStatus.creating:

        # Kubernetes is the only durable source for user-owned environment values.
        try:
            staged_envs = await cluster.applications.read_envs(application.id, organization.slug)
            user_envs = None if staged_envs is None else ApplicationEnvironment(envs=staged_envs).envs
        except (TypeError, ValueError):
            await applications.set_status(application.id, ApplicationStatus.failed)
            return jobs.fail("Application environment Secret is invalid")
        if user_envs is None:
            if claimed.attempt_count < jobs.OPERATION_ATTEMPT_LIMIT:
                return jobs.retry("Application environment Secret is not staged")
            await applications.set_status(application.id, ApplicationStatus.failed)
            return jobs.fail("Application environment Secret was not staged")

        # Resolve the Application's immutable provider assignments.
        database_registry = await database.get(organization.database_id)
        if database_registry is None:
            return jobs.fail("Database registry not found")
        storage_registry = await storage.get(organization.storage_id)
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
            metadata = await images.metadata(Image(application.image), user_envs)
            if metadata is None:
                await applications.set_status(application.id, ApplicationStatus.failed)
                return jobs.complete()
            updated = await applications.update_runtime(
                application.id,
                image=metadata.image,
                sdk=metadata.sdk,
                digest=metadata.digest,
                version=metadata.version,
                description=application.description,
                icon=application.icon,
            )
            if updated is None:
                return jobs.complete()
            application = updated

        # Provision stable database and storage identities before constructing the runtime Secret.
        connection = await db.schema(organization.id, application.id, application.database_password)
        bucket = organization.id.hex
        prefix = f"applications/{application.id.hex}/"
        await object_storage.create_prefix(bucket, prefix)
        credentials = applications.storage_credentials(application)
        if credentials is None:
            provisioned = await applications.provision_storage_credentials(
                application.id,
                lambda: object_storage.credentials(claimed.target_id.hex, bucket, ("shared/",), prefix),
                lambda generated: object_storage.discard(generated["access_key_id"]),
            )
            if provisioned is None:
                return jobs.complete()
            application, credentials = provisioned

        # Deployment is an explicit lifecycle action and is never called by compute reconciliation or releases.
        await cluster.applications.apply(
            DesiredApplication(
                id=application.id,
                namespace=organization.slug,
                image=application.image,
            ),
            envs={
                **user_envs,
                "LONGLINK_ENV": "production",
                "LONGLINK_DATABASE_HOST": connection["host"],
                "LONGLINK_DATABASE_NAME": connection["database_name"],
                "LONGLINK_DATABASE_PASSWORD": connection["password"],
                "LONGLINK_DATABASE_PORT": str(connection["port"]),
                "LONGLINK_DATABASE_SCHEMA": application.id.hex,
                "LONGLINK_DATABASE_SSLMODE": connection["sslmode"].value,
                "LONGLINK_DATABASE_USERNAME": connection["username"],
                "LONGLINK_STORAGE_BUCKET": bucket,
                "LONGLINK_STORAGE_ENDPOINT_URL": storage_registry.runtime_endpoint_url,
                "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
                "LONGLINK_STORAGE_PREFIX": prefix,
                "LONGLINK_STORAGE_REGION": exoscale_zone(storage_registry.runtime_endpoint_url),
                "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
                "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
            },
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
    queued = await applications.mark_running(application.id, organization.compute_id)
    if queued is None:
        return jobs.complete()

    # Complete lifecycle work only after the route is published; queued compute work recovers crash windows.
    result = await computes.reconcile_gateway(registry, cluster)
    if not await compute.record_success(
        registry.id,
        claimed.platform_version,
        result.gateway_url,
        result.gateway_ca_certificate,
        result.gateway_tls_certificate,
        result.gateway_tls_private_key,
        satisfy_pending=True,
    ):
        return jobs.retry("Application gateway state was not recorded")
    return jobs.complete()


@operation("application.delete")
async def delete(claimed: Operation) -> jobs.OperationOutcome:
    """Remove one Application route, runtime, provider state, and tombstone."""

    # Defer lifecycle work until the replica matches the Operation's Platform release.
    if claimed.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")

    # An absent tombstone means a previous attempt completed cleanup.
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
    await cluster.applications.delete(application.id, organization.slug)

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
        result.gateway_ca_certificate,
        result.gateway_tls_certificate,
        result.gateway_tls_private_key,
    ):
        return jobs.retry("Application gateway state was not recorded")
    await applications.purge(application.id)
    return jobs.complete()
