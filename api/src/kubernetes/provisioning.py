from src import adapters
from typing import cast
from src.utils import names
from src.logger import logger
from src.kubernetes import environments
from src.models.statuses import ApplicationStatus
from src.database.services import operations, registries, applications, organizations
from src.kubernetes.client import Kubernetes
from src.models.applications import ApplicationCreate
from longlink.tenant.database import users as tenant_users
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
    await storage.create(shared)
    await storage.create(bucket)

    # Reuse stored runtime credentials or create provider-scoped credentials for this application.
    credentials = applications.storage_runtime_credentials(application)
    if credentials is None:
        credentials = await storage.credentials(bucket, "write")

        # Persist credentials immediately so later cleanup operations can revoke them.
        try:
            persisted = await applications.set_storage_runtime_credentials(application.id, credentials)
        except Exception:
            await storage.revoke(bucket)
            raise

        if persisted is None:
            await storage.revoke(bucket)
            raise RuntimeError("Application no longer exists")

    connection = await db.schema(organization.id, application.id)

    # Inject platform-managed database and storage settings into the workload.
    envs = {
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": connection["host"],
        "LONGLINK_DATABASE_NAME": connection["database_name"],
        "LONGLINK_DATABASE_PASSWORD": connection["password"],
        "LONGLINK_DATABASE_PORT": str(connection["port"]),
        "LONGLINK_DATABASE_SCHEMA": schema,
        "LONGLINK_DATABASE_USERNAME": connection["username"],
        "LONGLINK_STORAGE_BUCKET": bucket,
        "LONGLINK_STORAGE_ENDPOINT_URL": storage_registry.runtime_endpoint_url or storage_registry.endpoint_url,
        "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
        "LONGLINK_STORAGE_SHARED_BUCKET": shared,
        "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
    }
    await compute.create(
        organization.slug,
        str(application.id),
        runtime_image,
        {**payload.envs, **envs},
    )


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
