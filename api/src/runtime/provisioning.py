from src import adapters
from typing import cast
from datetime import UTC, datetime
from src.utils import names
from src.logger import logger
from src.runtime import environments
from tenant.database import users as tenant_users
from src.models.statuses import ApplicationStatus
from src.database.services import operations, registries, applications, organizations
from src.runtime.kubernetes import Kubernetes
from src.models.applications import ApplicationCreate
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def provision_application_runtime_resources(
    organization: Organization,
    application: Application,
    payload: ApplicationCreate,
    runtime_image: str,
    compute_registry: ComputeRegistry,
    database_registry: DatabaseRegistry,
    storage_registry: StorageRegistry,
) -> None:
    """Provision namespace, database, storage, and workload resources for one application."""

    compute = Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret)
    db = adapters.database(database_registry)
    bucket = names.application_bucket(organization.slug, application.slug)
    shared = names.organization_shared_bucket(organization.slug)
    schema = application.id.hex

    await compute.namespace(organization.slug)

    # Synchronize shared users through the stored tenant shared-schema URL.
    if organization.shared_schema_url is None:
        raise ValueError("Organization has no shared schema URL")
    await tenant_users.sync_url(organization.shared_schema_url, await organizations.database_users(organization.id))

    # Ensure object storage exists before the workload receives backend credentials.
    storage = adapters.storage(storage_registry)
    await storage.bucket(shared)
    await storage.bucket(bucket)

    # Reuse stored runtime credentials or create provider-scoped credentials for this application.
    credentials = applications.storage_runtime_credentials(application)
    if credentials is None:
        credentials = await storage.runtime_credentials(f"longlink-{application.id.hex}", bucket, shared)

        # Persist credentials immediately so later cleanup operations can revoke them.
        try:
            persisted = await applications.set_storage_runtime_credentials(application.id, credentials)
        except Exception:
            await storage.revoke_runtime_credentials(credentials)
            raise

        if persisted is None:
            await storage.revoke_runtime_credentials(credentials)
            raise RuntimeError("Application no longer exists")

    connection = await db.schema(organization.id, application.id)
    envs = environments.runtime_environment(
        schema,
        connection,
        storage_registry,
        bucket,
        shared,
        credentials,
    )
    await compute.create(
        organization.slug,
        str(application.id),
        runtime_image,
        {**payload.envs, **envs},
    )


async def create_application_runtime(
    organization: Organization,
    application_slug: str,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Create the application row, provision runtime resources, and queue verification."""

    logger.info("Provisioning application %s/%s", organization.slug, application_slug)

    metadata = await environments.application_image_metadata(payload)
    digest = cast(str, metadata.digest)
    image = cast(str, metadata.image)

    # Application runtime requires a compute backend in the organization location.
    compute = await registries.compute(organization.location_id)
    if compute is None:
        raise RuntimeError("No compute cluster configured")

    # Application runtime requires a tenant database backend.
    db = await registries.database(organization.location_id)
    if db is None:
        raise RuntimeError("No database configured")

    # Application provisioning requires the organization runtime URL created with the organization.
    if organization.shared_schema_url is None:
        raise RuntimeError("Organization has no shared schema URL")

    # Application runtime requires shared object storage in the organization location.
    storage = await registries.storage(organization.location_id)
    if storage is None:
        raise RuntimeError("No storage configured")

    app = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=payload.image,
        compute_registry_id=compute.id,
        database_registry_id=db.id,
        storage_registry_id=storage.id,
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

        # Queue cleanup for any resources that were created before provisioning failed.
        try:
            await operations.queue_application_removal(app.id, scheduled_at=datetime.now(UTC), user=user)

        # Cleanup failures should not hide the original provisioning error.
        except Exception as cleanup_exc:
            logger.exception("Failed to queue partial application runtime cleanup for %s/%s: %r", organization.slug, application_slug, cleanup_exc)

        raise RuntimeError("Failed to initialize the application") from exc

    # Queue verification only after the workload has been applied.
    try:
        operation = await operations.queue_application_verification(app.id, user)

    # If verification cannot be queued, the applied workload must be removed.
    except Exception as exc:
        await applications.set_status(app.id, ApplicationStatus.failed)

        # The workload exists at this point, but without verification it must not be left running.
        try:
            await operations.queue_application_removal(app.id, scheduled_at=datetime.now(UTC), user=user)

        # Cleanup failures should not hide the queueing error.
        except Exception as cleanup_exc:
            logger.exception(
                "Failed to queue unverified application runtime cleanup for %s/%s: %r", organization.slug, application_slug, cleanup_exc
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
    organization: Organization,
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

    metadata = await environments.application_image_metadata(payload)
    digest = cast(str, metadata.digest)
    image = cast(str, metadata.image)

    # Runtime sync requires the app's assigned compute backend or the current location backend.
    compute = await registries.application_compute(application, organization.location_id)
    if compute is None:
        raise RuntimeError("No compute cluster configured")

    # Runtime sync requires the organization database backend.
    db = await registries.database(organization.location_id)
    if db is None:
        raise RuntimeError("No database configured")

    # Runtime sync requires the organization runtime URL created with the organization.
    if organization.shared_schema_url is None:
        raise RuntimeError("Organization has no shared schema URL")

    # Existing apps without an assigned storage registry can adopt the organization storage backend.
    storage = await registries.application_storage(application)
    if storage is None:
        storage = await registries.storage(organization.location_id)

    # Runtime sync requires an object storage backend.
    if storage is None:
        raise RuntimeError("No storage configured")

    # Stop if the application was deleted between loading and update.
    updated = await applications.update_runtime(
        application.id,
        image=payload.image,
        compute_registry_id=compute.id,
        database_registry_id=db.id,
        storage_registry_id=storage.id,
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

    # Reapply the workload with the refreshed runtime metadata.
    try:
        await provision_application_runtime_resources(
            organization,
            updated,
            payload,
            image,
            compute,
            db,
            storage,
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
