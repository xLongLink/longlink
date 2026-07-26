from src import adapters
from src.utils import jobs, images
from src.operations import computes
from src.utils.jobs import operation
from src.environments import env
from src.models.types import Image
from src.models.statuses import ApplicationStatus
from src.database.services import compute, storage, database, applications, organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.applications import DesiredApplication
from src.database.models.operations import Operation


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
    registry = await compute.get(organization.compute_id, include_deleted=True)
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
                organization_id=organization.id,
                namespace=organization.slug,
                image=application.image,
            ),
            str(registry.id),
            registry.proxy_secret,
            claimed.platform_version,
            envs=application.envs,
            connection=connection,
            storage_endpoint_url=storage_registry.runtime_endpoint_url,
            storage_credentials=credentials,
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
    registry = await compute.get(organization.compute_id, include_deleted=True)
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
