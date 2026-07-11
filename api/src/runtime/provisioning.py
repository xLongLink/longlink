from src import adapters
from typing import cast
from datetime import UTC, datetime
from src.utils import names
from src.logger import logger
from src.runtime import Kubernetes, bootstrap, environments
from src.models.statuses import ApplicationStatus
from src.database.services import database, operations, registries, applications
from src.models.applications import ApplicationCreate
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def remove_application_runtime(
    application: Application,
    organization: Organization | OrganizationDetails | OrganizationSummary,
) -> None:
    """Remove runtime resources for one application."""

    registry = await registries.application_compute(application, organization.location_id)

    # Remove workload resources only when the app has a compute backend to target.
    if registry is not None:
        adapter = Kubernetes(registry.kubeconfig, registry.proxy_secret)
        await adapter.delete_application(organization.slug, application.slug)

    # Remove the application schema from the database registry that originally hosted it.
    if application.database_registry_id is not None:
        registry = await database.get(application.database_registry_id, include_deleted=True)

        # Missing registries are tolerated during cleanup because resources may already be gone.
        if registry is not None:
            adapter = adapters.database(registry)
            await adapter.delete_schema(
                organization.slug,
                application.slug,
                organization_id=organization.id,
                application_id=application.id,
            )

    registry = await registries.application_storage(application)

    # Remove the application bucket only when storage was assigned.
    if registry is not None and application.storage_bucket_name is not None:
        adapter = adapters.storage(registry)
        await adapter.delete_bucket(application.storage_bucket_name)


async def provision_application_runtime_resources(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    application: Application,
    payload: ApplicationCreate,
    runtime_image: str,
    compute_registry: ComputeRegistry,
    database_registry: DatabaseRegistry,
    storage_registry: StorageRegistry | None,
    rollout_token: str = "",
) -> None:
    """Provision namespace, database, storage, and workload resources for one application."""

    compute = Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret)
    db = adapters.database(database_registry)
    bucket = application.storage_bucket_name
    shared = organization.shared_storage_bucket_name

    # Application buckets are assigned when the control-plane row is created.
    if bucket is None:
        raise ValueError("Application has no assigned storage bucket")

    # Shared buckets are assigned when the organization row is created.
    if shared is None:
        raise ValueError("Organization has no assigned shared storage bucket")

    await compute.namespace(organization.slug)
    await bootstrap.sync_organization_users(organization, database_registry)
    credentials: adapters.StorageRuntimeCredentials | None = None

    # Provision storage resources only when this location has storage configured.
    if storage_registry is not None:
        # Ensure object storage exists before the workload receives backend credentials.
        storage = adapters.storage(storage_registry)
        await storage.bucket(shared)
        await storage.bucket(bucket)
        credentials = {
            "access_key_id": storage_registry.access_key_id,
            "secret_access_key": storage_registry.secret_access_key,
        }

    connection = await db.schema(
        organization.slug,
        application.slug,
        organization_id=organization.id,
        application_id=application.id,
    )
    envs = environments.runtime_environment(
        application.slug,
        connection,
        storage_registry,
        bucket,
        shared,
        credentials,
    )
    await compute.application(
        organization.slug,
        application.slug,
        str(application.id),
        runtime_image,
        8000,
        {**payload.envs, **envs},
        rollout_token=rollout_token,
    )


async def create_application_runtime(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    application_slug: str,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Create the application row, provision runtime resources, and queue verification."""

    bucket = names.knames(f"{organization.slug}-{application_slug}")
    logger.info("Provisioning application %s/%s", organization.slug, application_slug)

    metadata = await environments.application_image_metadata(payload)
    digest = cast(str, metadata.digest)
    image = cast(str, metadata.image)

    # Application runtime requires a compute backend in the organization location.
    compute = await registries.latest_compute(organization.location_id)
    if compute is None:
        raise RuntimeError("No compute cluster configured")

    # Application runtime requires a tenant database backend.
    db = await registries.organization_database(organization)
    if db is None:
        raise RuntimeError("No database configured")

    storage = await registries.organization_storage(organization)

    app = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=payload.image,
        compute_registry_id=compute.id,
        database_registry_id=db.id,
        storage_registry_id=storage.id if storage is not None else None,
        storage_bucket_name=bucket,
        sdk=metadata.sdk,
        digest=digest,
        version=metadata.version,
        status=ApplicationStatus.creating,
        description=payload.description,
        icon=payload.icon.value if payload.icon is not None else None,
        user=user,
    )

    # Provision the namespace, schema, and workload in order so failures can mark the application as failed.
    try:
        await provision_application_runtime_resources(
            organization,
            app,
            payload,
            image,
            compute,
            db,
            storage,
        )

    # Failed provisioning leaves a failed application row and triggers best-effort cleanup.
    except Exception as exc:
        await applications.set_status(app.id, ApplicationStatus.failed)
        logger.exception("Failed to initialize application runtime for %s/%s: %r", organization.slug, application_slug, exc)

        # Remove any resources that were created before the provisioning step failed.
        try:
            await remove_application_runtime(app, organization)

        # Cleanup failures should not hide the original provisioning error.
        except Exception as cleanup_exc:
            logger.exception("Failed to clean partial application runtime for %s/%s: %r", organization.slug, application_slug, cleanup_exc)

        raise RuntimeError("Failed to initialize the application") from exc

    # Queue verification only after the workload has been applied.
    try:
        operation = await operations.queue_application_verification(app.id, user)

    # If verification cannot be queued, the applied workload must be removed.
    except Exception as exc:
        await applications.set_status(app.id, ApplicationStatus.failed)

        # The workload exists at this point, but without verification it must not be left running.
        try:
            await remove_application_runtime(app, organization)

        # Cleanup failures should not hide the queueing error.
        except Exception as cleanup_exc:
            logger.exception(
                "Failed to clean unverified application runtime for %s/%s: %r", organization.slug, application_slug, cleanup_exc
            )

        logger.exception("Failed to queue application verification for %s/%s: %r", organization.slug, payload.name, exc)
        raise RuntimeError("Failed to queue application verification") from exc

    logger.info(
        "Queued application verification %s for %s/%s",
        operation.id,
        organization.slug,
        payload.name,
    )
    return app


async def sync_application_runtime(
    application: Application,
    organization: Organization | OrganizationDetails | OrganizationSummary,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Update an existing application row and refresh its runtime workload."""

    logger.info(
        "Syncing application %s/%s from image %s",
        organization.slug,
        application.slug,
        payload.image,
    )

    # Runtime sync requires the organization shared bucket assigned at creation.
    if organization.shared_storage_bucket_name is None:
        raise ValueError("Organization has no assigned shared storage bucket")
    metadata = await environments.application_image_metadata(payload)
    digest = cast(str, metadata.digest)
    image = cast(str, metadata.image)

    # Runtime sync requires the app's assigned compute backend or the current location backend.
    compute = await registries.application_compute(application, organization.location_id)
    if compute is None:
        raise RuntimeError("No compute cluster configured")

    # Runtime sync requires the organization database backend.
    db = await registries.organization_database(organization)
    if db is None:
        raise RuntimeError("No database configured")

    # Existing apps without assigned storage can adopt the organization storage backend.
    storage = await registries.application_storage(application)
    if storage is None:
        storage = await registries.organization_storage(organization)

    # Stop if the application was deleted between loading and update.
    updated = await applications.update_runtime(
        application.id,
        image=payload.image,
        compute_registry_id=compute.id,
        database_registry_id=db.id,
        storage_registry_id=storage.id if storage is not None else None,
        sdk=metadata.sdk,
        digest=digest,
        version=metadata.version,
        status=ApplicationStatus.creating,
        description=payload.description,
        icon=payload.icon.value if payload.icon is not None else None,
        user=user,
    )
    if updated is None:
        raise RuntimeError("Application no longer exists")

    # Reapply the workload with a fresh rollout token so fixed development tags pull the newest image.
    try:
        await provision_application_runtime_resources(
            organization,
            updated,
            payload,
            image,
            compute,
            db,
            storage,
            rollout_token=datetime.now(UTC).isoformat(),
        )

    # Refresh failures mark the application failed so users do not open a broken runtime.
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        logger.exception("Failed to refresh application runtime for %s/%s: %r", organization.slug, application.slug, exc)
        raise RuntimeError("Failed to refresh the application runtime") from exc

    operation = await operations.queue_application_verification(application.id, user)
    logger.info(
        "Queued application sync verification %s for %s/%s",
        operation.id,
        organization.slug,
        payload.name,
    )
    return updated
