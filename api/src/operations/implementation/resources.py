from src import compute as compute_runtime
from src import adapters
from uuid import UUID
from typing import cast
from datetime import UTC, datetime
from src.utils import names, buckets
from src.logger import logger
from src.models.statuses import ApplicationStatus
from src.database.services import database, operations, applications, organizations
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.operations.constants import APPLICATION_VERIFY_STEP
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.operations.implementation import registries, environments
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def other_application_storage_buckets(organization_id: UUID, application_id: UUID) -> list[str]:
    """Return assigned storage buckets for other applications in one organization."""

    storage_bucket_names = []

    # Include active and deleted applications so credential policies can exclude all other app buckets.
    for application in await applications.list_by_organization(organization_id, include_deleted=True):

        # Skip the current application and apps that never received a storage bucket.
        if application.id != application_id and application.storage_bucket_name is not None:
            storage_bucket_names.append(application.storage_bucket_name)

    return storage_bucket_names


async def remove_application_runtime(
    application: Application,
    organization: Organization | OrganizationDetails | OrganizationSummary,
) -> None:
    """Remove runtime resources for one application."""

    names.knames(organization.slug)
    names.knames(application.slug)
    names.k8name(organization.slug)
    names.dbname(organization.slug)

    compute_registry = await registries.application_compute_registry(application, organization.location_id)

    # Remove workload resources only when the app has a compute backend to target.
    if compute_registry is not None:
        compute_adapter = compute_runtime.kubernetes(compute_registry)
        await compute_adapter.delete_application(organization.slug, application.slug)

    # Remove the application schema from the database registry that originally hosted it.
    if application.database_registry_id is not None:
        database_registry = await database.get(application.database_registry_id, include_deleted=True)

        # Missing registries are tolerated during cleanup because resources may already be gone.
        if database_registry is not None:
            db_client = adapters.database(database_registry)
            await db_client.delete_schema(
                organization.slug,
                application.slug,
                organization_id=organization.id,
                application_id=application.id,
            )

    storage_registry = await registries.application_storage_registry(application)

    # Remove the application bucket only when storage was assigned.
    if storage_registry is not None and application.storage_bucket_name is not None:
        storage_client = adapters.storage(storage_registry)
        await storage_client.delete_bucket(application.storage_bucket_name)


async def remove_organization_runtime(organization: Organization | OrganizationDetails | OrganizationSummary) -> None:
    """Remove runtime resources for one organization and its applications."""

    names.knames(organization.slug)
    names.k8name(organization.slug)
    names.dbname(organization.slug)

    organization_applications = await applications.list_by_organization(organization.id, include_deleted=True)

    # Delete application-scoped resources before deleting shared organization resources.
    for application in organization_applications:
        await remove_application_runtime(application, organization)

    compute_registries = []
    seen_compute_registry_ids: set[UUID] = set()

    # Collect every compute registry that may still contain organization resources.
    for application in organization_applications:
        registry = await registries.application_compute_registry(application, organization.location_id)

        # Deduplicate registries so namespace deletion runs once per backend.
        if registry is not None and registry.id not in seen_compute_registry_ids:
            compute_registries.append(registry)
            seen_compute_registry_ids.add(registry.id)

    latest_compute = await registries.latest_compute_registry(organization.location_id)

    # Include the current location registry for organizations created before any applications existed.
    if latest_compute is not None and latest_compute.id not in seen_compute_registry_ids:
        compute_registries.append(latest_compute)
        seen_compute_registry_ids.add(latest_compute.id)

    # Namespace deletion removes shared gateway/runtime resources for the organization.
    for registry in compute_registries:
        compute_adapter = compute_runtime.kubernetes(registry)
        await compute_adapter.delete_namespace(organization.slug)

    database_registry = await registries.organization_database_registry(organization, include_deleted=True)

    # Delete the tenant database after app schemas have been removed.
    if database_registry is not None:
        db_client = adapters.database(database_registry)
        await db_client.delete_database(organization.slug)

    storage_registry = await registries.organization_storage_registry(organization, include_deleted=True)

    # Delete the shared bucket only when one was assigned.
    if storage_registry is not None and organization.shared_storage_bucket_name is not None:
        storage_client = adapters.storage(storage_registry)
        await storage_client.delete_bucket(organization.shared_storage_bucket_name)


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

    compute_client = compute_runtime.kubernetes(compute_registry)
    db_client = adapters.database(database_registry)
    application_bucket_name = application.storage_bucket_name
    shared_bucket_name = organization.shared_storage_bucket_name

    # Application buckets are assigned when the control-plane row is created.
    if application_bucket_name is None:
        raise ValueError("Application has no assigned storage bucket")

    # Shared buckets are assigned when the organization row is created.
    if shared_bucket_name is None:
        raise ValueError("Organization has no assigned shared storage bucket")

    await compute_client.namespace(organization.slug)
    await db_client.sync_users(organization.slug, await organizations.database_users(organization.id))
    storage_credentials: adapters.StorageRuntimeCredentials | None = None

    # Provision storage resources only when this location has storage configured.
    if storage_registry is not None:

        # Ensure object storage exists before the workload receives backend credentials.
        storage_client = adapters.storage(storage_registry)
        await storage_client.bucket(shared_bucket_name)
        await storage_client.bucket(application_bucket_name)
        storage_credentials = await storage_client.application_credentials(
            application_bucket_name,
            shared_bucket_name,
            await other_application_storage_buckets(organization.id, application.id),
        )

    database_connection = await db_client.schema(
        organization.slug,
        application.slug,
        organization_id=organization.id,
        application_id=application.id,
    )
    runtime_envs = environments.runtime_environment(
        application.slug,
        database_connection,
        storage_registry,
        application_bucket_name,
        shared_bucket_name,
        storage_credentials,
    )
    await compute_client.application(
        organization.slug,
        application.slug,
        str(application.id),
        runtime_image,
        8000,
        {**payload.envs, **runtime_envs},
        rollout_token=rollout_token,
    )


async def create_application_runtime(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    application_slug: str,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Create the application row, provision runtime resources, and queue verification."""

    application_bucket_name = buckets.application(organization.slug, application_slug)
    logger.info("Provisioning application %s/%s", organization.slug, application_slug)

    image_metadata = await environments.application_image_metadata(payload)
    digest = cast(str, image_metadata.digest)
    runtime_image = cast(str, image_metadata.image)

    compute_registry = await registries.latest_compute_registry(organization.location_id)

    # Application runtime requires a compute backend in the organization location.
    if compute_registry is None:
        raise RuntimeError("No compute cluster configured")

    database_registry = await registries.organization_database_registry(organization)

    # Application runtime requires a tenant database backend.
    if database_registry is None:
        raise RuntimeError("No database configured")

    storage_registry = await registries.organization_storage_registry(organization)

    application = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=payload.image,
        compute_registry_id=compute_registry.id,
        database_registry_id=database_registry.id,
        storage_registry_id=storage_registry.id if storage_registry is not None else None,
        storage_bucket_name=application_bucket_name,
        sdk=image_metadata.sdk,
        digest=digest,
        version=image_metadata.version,
        status=ApplicationStatus.creating,
        description=payload.description,
        icon=payload.icon.value if payload.icon is not None else None,
        user=user,
    )

    # Provision the namespace, schema, and workload in order so failures can mark the application as failed.
    try:
        await provision_application_runtime_resources(
            organization,
            application,
            payload,
            runtime_image,
            compute_registry,
            database_registry,
            storage_registry,
        )

    # Failed provisioning leaves a failed application row and triggers best-effort cleanup.
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        logger.exception("Failed to initialize application runtime for %s/%s", organization.slug, application_slug)

        # Remove any resources that were created before the provisioning step failed.
        try:
            await remove_application_runtime(application, organization)

        # Cleanup failures should not hide the original provisioning error.
        except Exception:
            logger.exception("Failed to clean partial application runtime for %s/%s", organization.slug, application_slug)

        raise RuntimeError("Failed to initialize the application") from exc

    # Queue verification only after the workload has been applied.
    try:
        operation = await operations.create(
            OperationKind.application_create,
            application_id=application.id,
            step=APPLICATION_VERIFY_STEP,
            user=user,
        )

    # If verification cannot be queued, the applied workload must be removed.
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)

        # The workload exists at this point, but without verification it must not be left running.
        try:
            await remove_application_runtime(application, organization)

        # Cleanup failures should not hide the queueing error.
        except Exception:
            logger.exception("Failed to clean unverified application runtime for %s/%s", organization.slug, application_slug)

        logger.exception(
            "Failed to queue application verification for %s/%s",
            organization.slug,
            payload.name,
        )
        raise RuntimeError("Failed to queue application verification") from exc

    logger.info(
        "Queued application creation verification %s for %s/%s",
        operation.id,
        organization.slug,
        payload.name,
    )
    return application


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
    names.knames(organization.slug)
    names.knames(application.slug)
    names.k8name(organization.slug)
    names.dbname(organization.slug)

    # Runtime sync requires the organization shared bucket assigned at creation.
    if organization.shared_storage_bucket_name is None:
        raise ValueError("Organization has no assigned shared storage bucket")
    image_metadata = await environments.application_image_metadata(payload)
    digest = cast(str, image_metadata.digest)
    runtime_image = cast(str, image_metadata.image)

    compute_registry = await registries.application_compute_registry(application, organization.location_id)

    # Runtime sync requires the app's assigned compute backend or the current location backend.
    if compute_registry is None:
        raise RuntimeError("No compute cluster configured")

    database_registry = await registries.organization_database_registry(organization)

    # Runtime sync requires the organization database backend.
    if database_registry is None:
        raise RuntimeError("No database configured")

    storage_registry = await registries.application_storage_registry(application)

    # Existing apps without assigned storage can adopt the organization storage backend.
    if storage_registry is None:
        storage_registry = await registries.organization_storage_registry(organization)

    updated_application = await applications.update_runtime(
        application.id,
        image=payload.image,
        compute_registry_id=compute_registry.id,
        database_registry_id=database_registry.id,
        storage_registry_id=storage_registry.id if storage_registry is not None else None,
        sdk=image_metadata.sdk,
        digest=digest,
        version=image_metadata.version,
        status=ApplicationStatus.creating,
        description=payload.description,
        icon=payload.icon.value if payload.icon is not None else None,
        user=user,
    )

    # Stop if the application was deleted between loading and update.
    if updated_application is None:
        raise RuntimeError("Application no longer exists")

    # Reapply the workload with a fresh rollout token so fixed development tags pull the newest image.
    try:
        await provision_application_runtime_resources(
            organization,
            updated_application,
            payload,
            runtime_image,
            compute_registry,
            database_registry,
            storage_registry,
            rollout_token=datetime.now(UTC).isoformat(),
        )

    # Refresh failures mark the application failed so users do not open a broken runtime.
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        logger.exception("Failed to refresh application runtime for %s/%s", organization.slug, application.slug)
        raise RuntimeError("Failed to refresh the application runtime") from exc

    operation = await operations.create(
        OperationKind.application_create,
        application_id=application.id,
        step=APPLICATION_VERIFY_STEP,
        user=user,
    )
    logger.info(
        "Queued application sync verification %s for %s/%s",
        operation.id,
        organization.slug,
        payload.name,
    )
    return updated_application
