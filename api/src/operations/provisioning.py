import urllib.parse
from src import adapters
from uuid import UUID
from datetime import UTC, datetime
from src.utils import names, images, buckets, url
from src.logger import logger
from src.constants import APP_SERVICE_PORT
from src.models.metadata import LongLinkMetadata
from src.models.statuses import ApplicationStatus
from src.database.services import compute, storage, database, operations, applications, organizations
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization

PLATFORM_ENVIRONMENT_NAMES = {
    "LONGLINK_DATABASE_SCHEMA",
    "LONGLINK_DATABASE_URL",
    "LONGLINK_ENV",
    "LONGLINK_STORAGE_BUCKET",
    "LONGLINK_STORAGE_SHARED_BUCKET",
    "LONGLINK_STORAGE_URL",
}
PLATFORM_ENVIRONMENT_PREFIX = "LONGLINK_"
PLATFORM_STORAGE_ENVIRONMENT_NAMES = {
    "LONGLINK_STORAGE_BUCKET",
    "LONGLINK_STORAGE_SHARED_BUCKET",
    "LONGLINK_STORAGE_URL",
}


def application_runtime_environment(payload: ApplicationCreate) -> dict[str, str]:
    """Return user-supplied environment values that are safe to pass to the runtime."""

    # Reserve LongLink-prefixed values for the platform so users cannot spoof managed runtime configuration.
    return {name: value for name, value in payload.envs.items() if not name.startswith(PLATFORM_ENVIRONMENT_PREFIX)}


def validate_storage_environment_requirements(
    image_metadata: LongLinkMetadata,
    storage_registry: StorageRegistry | None,
    location_id: UUID,
) -> None:
    """Ensure required platform storage values can be provided by the selected location."""

    missing_storage_envs = sorted(
        environment.name
        for environment in image_metadata.environments
        if environment.required and environment.name in PLATFORM_STORAGE_ENVIRONMENT_NAMES
    )
    if storage_registry is None and missing_storage_envs:
        raise RuntimeError(
            f"No storage configured for location '{location_id}' required by image environment variables: "
            f"{', '.join(missing_storage_envs)}"
        )


async def latest_compute_registry(location_id: UUID) -> ComputeRegistry | None:
    """Return the newest compute registry for one location."""

    return max(
        (registry for registry in await compute.fetch_all() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def latest_database_registry(location_id: UUID) -> DatabaseRegistry | None:
    """Return the newest database registry for one location."""

    return max(
        (registry for registry in await database.fetch_all() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def latest_storage_registry(location_id: UUID) -> StorageRegistry | None:
    """Return the newest storage registry for one location."""

    return max(
        (registry for registry in await storage.fetch_all() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def application_image_metadata(
    payload: ApplicationCreate,
) -> LongLinkMetadata:
    """Inspect image metadata and validate required environment values."""

    image_metadata = await images.metadata(payload.image)
    if image_metadata is None:
        raise ValueError("Image metadata could not be inspected")

    if image_metadata.digest is None or image_metadata.image is None:
        raise ValueError("Image digest could not be resolved")

    # Reject required LongLink-prefixed envs that the platform does not know how to provide.
    unsupported_platform_envs = sorted(
        environment.name
        for environment in image_metadata.environments
        if environment.required
        and environment.name.startswith(PLATFORM_ENVIRONMENT_PREFIX)
        and environment.name not in PLATFORM_ENVIRONMENT_NAMES
    )
    if unsupported_platform_envs:
        raise ValueError(f"Unsupported platform environment variables: {', '.join(unsupported_platform_envs)}")

    # Reject images that require app-managed values the creation payload does not provide.
    missing_envs = sorted(
        environment.name
        for environment in image_metadata.environments
        if environment.required
        and environment.name not in PLATFORM_ENVIRONMENT_NAMES
        and not payload.envs.get(environment.name, "").strip()
    )
    if missing_envs:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_envs)}")

    return image_metadata


async def application_compute_registry(application: Application, location_id: UUID) -> ComputeRegistry | None:
    """Return the compute registry used by an application, falling back to the newest one."""

    if application.compute_registry_id is not None:
        return await compute.get(application.compute_registry_id, include_deleted=True)

    return await latest_compute_registry(location_id)


async def organization_database_registry(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    include_deleted: bool = False,
) -> DatabaseRegistry | None:
    """Return the single database registry used by an organization."""

    for application in await applications.list_by_organization(organization.id, include_deleted=include_deleted):
        if application.database_registry is not None:
            return application.database_registry

        if application.database_registry_id is not None:
            registry = await database.get(application.database_registry_id, include_deleted=True)
            if registry is not None:
                return registry

    return await latest_database_registry(organization.location_id)


async def organization_storage_registry(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    include_deleted: bool = False,
) -> StorageRegistry | None:
    """Return the single storage registry used by an organization."""

    for application in await applications.list_by_organization(organization.id, include_deleted=include_deleted):
        if application.storage_registry is not None:
            return application.storage_registry

        if application.storage_registry_id is not None:
            registry = await storage.get(application.storage_registry_id, include_deleted=True)
            if registry is not None:
                return registry

    return await latest_storage_registry(organization.location_id)


async def application_storage_registry(
    application: Application,
) -> StorageRegistry | None:
    """Return the storage registry used by an application."""

    if application.storage_registry_id is not None:
        return await storage.get(application.storage_registry_id, include_deleted=True)

    return None


def shared_storage_bucket(organization: Organization | OrganizationDetails | OrganizationSummary) -> str:
    """Return the assigned shared storage bucket for one organization."""

    if organization.shared_storage_bucket_name is None:
        raise ValueError("Organization has no assigned shared storage bucket")

    return organization.shared_storage_bucket_name


def application_storage_bucket(application: Application) -> str:
    """Return the assigned storage bucket for one application."""

    if application.storage_bucket_name is None:
        raise ValueError("Application has no assigned storage bucket")

    return application.storage_bucket_name


async def other_application_storage_buckets(organization_id: UUID, application_id: UUID) -> list[str]:
    """Return assigned storage buckets for other applications in one organization."""

    return [
        application.storage_bucket_name
        for application in await applications.list_by_organization(organization_id, include_deleted=True)
        if application.id != application_id and application.storage_bucket_name is not None
    ]


async def remove_application_runtime(
    application: Application,
    organization: Organization | OrganizationDetails | OrganizationSummary,
) -> None:
    """Remove runtime resources for one application."""

    names.knames(organization.slug, "Organization")
    names.knames(application.slug, "Application name")
    names.k8name(organization.slug)
    names.dbname(organization.slug)

    compute_registry = await application_compute_registry(application, organization.location_id)
    if compute_registry is not None:
        compute_adapter = adapters.compute(compute_registry)
        await compute_adapter.delete_application(organization.slug, application.slug)

    if application.database_registry_id is not None:
        database_registry = await database.get(application.database_registry_id, include_deleted=True)
        if database_registry is not None:
            db_client = adapters.database(database_registry)
            await db_client.delete_schema(organization.slug, application.slug)

    storage_registry = await application_storage_registry(application)
    if storage_registry is not None and application.storage_bucket_name is not None:
        storage_client = adapters.storage(storage_registry)
        await storage_client.delete_bucket(application.storage_bucket_name)


async def remove_organization_runtime(
    organization: Organization | OrganizationDetails | OrganizationSummary,
) -> None:
    """Remove runtime resources for one organization and its applications."""

    names.knames(organization.slug, "Organization")
    names.k8name(organization.slug)
    names.dbname(organization.slug)

    organization_applications = await applications.list_by_organization(organization.id, include_deleted=True)
    for application in organization_applications:
        await remove_application_runtime(application, organization)

    compute_registries = []
    for application in organization_applications:
        registry = await application_compute_registry(application, organization.location_id)
        if registry is not None and registry.id not in {item.id for item in compute_registries}:
            compute_registries.append(registry)

    latest_compute = await latest_compute_registry(organization.location_id)
    if latest_compute is not None and latest_compute.id not in {item.id for item in compute_registries}:
        compute_registries.append(latest_compute)

    for registry in compute_registries:
        compute_adapter = adapters.compute(registry)
        await compute_adapter.delete_namespace(organization.slug)

    database_registry = await organization_database_registry(organization, include_deleted=True)
    if database_registry is not None:
        db_client = adapters.database(database_registry)
        await db_client.delete_database(organization.slug)

    storage_registry = await organization_storage_registry(organization, include_deleted=True)
    if storage_registry is not None and organization.shared_storage_bucket_name is not None:
        storage_client = adapters.storage(storage_registry)
        await storage_client.delete_bucket(organization.shared_storage_bucket_name)


def runtime_storage_url(storage_registry: StorageRegistry, credentials: adapters.StorageRuntimeCredentials) -> str:
    """Return a storage URL compatible with the SDK runtime."""

    endpoint_url = storage_registry.runtime_endpoint_url or storage_registry.endpoint_url
    endpoint = urllib.parse.urlsplit(endpoint_url)
    if not endpoint.scheme or not endpoint.netloc:
        raise ValueError(f"Invalid storage runtime endpoint URL: {endpoint_url}")

    # Store scoped runtime credentials in the URL while preserving the endpoint shape for fsspec.
    access_key_id = urllib.parse.quote(credentials["access_key_id"], safe="")
    secret_access_key = urllib.parse.quote(credentials["secret_access_key"], safe="")
    netloc = f"{access_key_id}:{secret_access_key}@{endpoint.netloc}"
    return urllib.parse.urlunsplit(
        (
            f"s3+{endpoint.scheme}",
            netloc,
            endpoint.path,
            endpoint.query,
            endpoint.fragment,
        )
    )


def runtime_environment(
    application_slug: str,
    database_url: str,
    storage_registry: StorageRegistry | None,
    storage_bucket_name: str | None = None,
    shared_storage_bucket_name: str | None = None,
    storage_credentials: adapters.StorageRuntimeCredentials | None = None,
) -> dict[str, str]:
    """Build platform-managed environment variables for an application runtime."""

    environment = {
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_URL": url.database(database_url),
        "LONGLINK_DATABASE_SCHEMA": application_slug,
    }

    if storage_registry is not None:
        if storage_credentials is None:
            raise ValueError("Storage runtime credentials are required when storage is configured")
        if storage_bucket_name is None or shared_storage_bucket_name is None:
            raise ValueError("Assigned storage buckets are required when storage is configured")

        environment.update(
            {
                "LONGLINK_STORAGE_URL": runtime_storage_url(storage_registry, storage_credentials),
                "LONGLINK_STORAGE_BUCKET": storage_bucket_name,
                "LONGLINK_STORAGE_SHARED_BUCKET": shared_storage_bucket_name,
            }
        )

    return environment


async def sync_organization_users(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    registry: DatabaseRegistry | None = None,
) -> None:
    """Synchronize organization members into the shared users schema."""

    database_registry = registry or await organization_database_registry(organization)
    if database_registry is None:
        return

    db_client = adapters.database(database_registry)
    database_users = await organizations.database_users(organization.id)
    await db_client.sync_users(organization.slug, database_users)


async def sync_user_organizations(user: User) -> None:
    """Synchronize every organization database affected by one user."""

    for organization in await organizations.list_by_user(user.id):
        await sync_organization_users(organization)


async def provision_application_runtime_resources(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    application_slug: str,
    application_id: UUID,
    application_bucket_name: str,
    payload: ApplicationCreate,
    runtime_image: str,
    compute_registry: ComputeRegistry,
    database_registry: DatabaseRegistry,
    storage_registry: StorageRegistry | None,
    rollout_token: str = "",
) -> None:
    """Provision namespace, database, storage, and workload resources for one application."""

    k8s = adapters.compute(compute_registry)
    db_client = adapters.database(database_registry)

    await k8s.namespace(organization.slug)
    await db_client.sync_users(organization.slug, await organizations.database_users(organization.id))
    storage_credentials: adapters.StorageRuntimeCredentials | None = None
    if storage_registry is not None:
        # Ensure object storage exists before the workload receives backend credentials.
        storage_client = adapters.storage(storage_registry)
        shared_bucket_name = shared_storage_bucket(organization)
        await storage_client.bucket(shared_bucket_name)
        await storage_client.bucket(application_bucket_name)
        storage_credentials = await storage_client.application_credentials(
            application_bucket_name,
            shared_bucket_name,
            await other_application_storage_buckets(organization.id, application_id),
        )

    database_url = await db_client.schema(organization.slug, application_slug)
    runtime_envs = runtime_environment(
        application_slug,
        database_url,
        storage_registry,
        application_bucket_name,
        shared_storage_bucket(organization),
        storage_credentials,
    )
    application_arguments = (
        organization.slug,
        application_slug,
        str(application_id),
        runtime_image,
        APP_SERVICE_PORT,
        {**application_runtime_environment(payload), **runtime_envs},
    )

    if rollout_token:
        await k8s.application(*application_arguments, rollout_token=rollout_token)
        return

    await k8s.application(*application_arguments)


async def create_application_runtime(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Create the application row, provision runtime resources, and queue verification."""

    application_slug = names.slugify(payload.name, "Application name")
    names.knames(organization.slug, "Organization")
    names.knames(application_slug, "Application name")
    names.k8name(organization.slug)
    names.dbname(organization.slug)
    shared_storage_bucket(organization)
    application_bucket_name = buckets.application(organization.slug, application_slug)
    logger.info("Provisioning application %s/%s", organization.slug, application_slug)

    image_metadata = await application_image_metadata(payload)
    digest = image_metadata.digest
    runtime_image = image_metadata.image
    assert digest is not None
    assert runtime_image is not None

    compute_registry = await latest_compute_registry(organization.location_id)
    if compute_registry is None:
        raise RuntimeError(f"No compute cluster configured for location '{organization.location_id}'")

    database_registry = await organization_database_registry(organization)
    if database_registry is None:
        raise RuntimeError(f"No database configured for location '{organization.location_id}'")

    storage_registry = await organization_storage_registry(organization)
    validate_storage_environment_requirements(image_metadata, storage_registry, organization.location_id)

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
            application_slug,
            application.id,
            application_bucket_name,
            payload,
            runtime_image,
            compute_registry,
            database_registry,
            storage_registry,
        )
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        logger.exception("Failed to initialize application runtime for %s/%s", organization.slug, application_slug)
        # Remove any resources that were created before the provisioning step failed.
        try:
            await remove_application_runtime(application, organization)
        except Exception:
            logger.exception("Failed to clean partial application runtime for %s/%s", organization.slug, application_slug)

        raise RuntimeError("Failed to initialize the application") from exc

    try:
        operation = await operations.create(
            OperationKind.application_create,
            application_id=application.id,
            step="verify",
            user=user,
        )
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        # The workload exists at this point, but without verification it must not be left running.
        try:
            await remove_application_runtime(application, organization)
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
    organization: OrganizationDetails,
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
    names.knames(organization.slug, "Organization")
    names.knames(application.slug, "Application name")
    names.k8name(organization.slug)
    names.dbname(organization.slug)
    shared_storage_bucket(organization)
    application_bucket_name = application_storage_bucket(application)
    image_metadata = await application_image_metadata(payload)
    digest = image_metadata.digest
    runtime_image = image_metadata.image
    assert digest is not None
    assert runtime_image is not None

    compute_registry = await application_compute_registry(application, organization.location_id)
    if compute_registry is None:
        raise RuntimeError(f"No compute cluster configured for location '{organization.location_id}'")

    database_registry = await organization_database_registry(organization)
    if database_registry is None:
        raise RuntimeError(f"No database configured for location '{organization.location_id}'")

    storage_registry = await application_storage_registry(application)
    if storage_registry is None:
        storage_registry = await organization_storage_registry(organization)
    validate_storage_environment_requirements(image_metadata, storage_registry, organization.location_id)

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
    if updated_application is None:
        raise RuntimeError("Application no longer exists")

    # Reapply the workload with a fresh rollout token so fixed development tags pull the newest image.
    try:
        await provision_application_runtime_resources(
            organization,
            application.slug,
            application.id,
            application_bucket_name,
            payload,
            runtime_image,
            compute_registry,
            database_registry,
            storage_registry,
            rollout_token=datetime.now(UTC).isoformat(),
        )
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        logger.exception("Failed to refresh application runtime for %s/%s", organization.slug, application.slug)
        raise RuntimeError("Failed to refresh the application runtime") from exc

    operation = await operations.create(
        OperationKind.application_create,
        application_id=application.id,
        step="verify",
        user=user,
    )
    logger.info(
        "Queued application sync verification %s for %s/%s",
        operation.id,
        organization.slug,
        payload.name,
    )
    return updated_application


async def create_organization_namespace(
    organization: Organization | OrganizationSummary,
) -> None:
    """Best-effort create the organization namespace on the active compute registry."""

    registry = await latest_compute_registry(organization.location_id)
    if registry is None:
        return

    try:
        await adapters.compute(registry).namespace(organization.slug)
    except Exception:
        logger.exception("Failed to create namespace for organization '%s'", organization.slug)


async def create_organization_database(
    organization: Organization | OrganizationSummary,
) -> None:
    """Best-effort create the organization database on the active database registry."""

    registry = await latest_database_registry(organization.location_id)
    if registry is None:
        return

    try:
        db_client = adapters.database(registry)
        await db_client.database(organization.slug)
        await db_client.sync_users(organization.slug, await organizations.database_users(organization.id))
    except Exception:
        logger.exception("Failed to create database for organization '%s'", organization.slug)


async def create_organization_storage(
    organization: Organization | OrganizationSummary,
) -> None:
    """Best-effort create the assigned shared bucket on the active storage registry."""

    registry = await latest_storage_registry(organization.location_id)
    if registry is None:
        return

    try:
        storage_client = adapters.storage(registry)
        await storage_client.bucket(shared_storage_bucket(organization))
    except Exception:
        logger.exception("Failed to create storage for organization '%s'", organization.slug)
