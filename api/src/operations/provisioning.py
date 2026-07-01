from uuid import UUID
from datetime import UTC, datetime
from src.utils import names, images
from src.logger import logger
from src.constants import APP_SERVICE_PORT
from sqlalchemy.engine import make_url
from src.models.metadata import LongLinkMetadata
from src.models.statuses import ApplicationStatus
from src.adapters.database import Postgres
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate
from src.adapters.compute.k8s import K8s
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.models.applications import Application
from src.database.models.organizations import Organization
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

PLATFORM_ENVIRONMENT_NAMES = {
    "LONGLINK_DATABASE_SCHEMA",
    "LONGLINK_DATABASE_URL",
    "LONGLINK_ENV",
    "LONGLINK_STORAGE_ACCESS_KEY_ID",
    "LONGLINK_STORAGE_ENDPOINT_URL",
    "LONGLINK_STORAGE_PROTOCOL",
    "LONGLINK_STORAGE_SECRET_ACCESS_KEY",
}


async def latest_compute_registry(location_id: UUID) -> ComputeRegistry | None:
    """Return the newest compute registry for one location."""

    return max(
        (registry for registry in await compute.list() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def latest_database_registry(location_id: UUID) -> DatabaseRegistry | None:
    """Return the newest database registry for one location."""

    return max(
        (registry for registry in await database.list() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def latest_storage_registry(location_id: UUID) -> StorageRegistry | None:
    """Return the newest storage registry for one location."""

    return max(
        (registry for registry in await storage.list() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def application_image_metadata(payload: ApplicationCreate) -> LongLinkMetadata | None:
    """Inspect image metadata and validate required environment values."""

    image_metadata = await images.metadata(payload.image)
    if image_metadata is None:
        return None

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


async def organization_database_registry(organization: Organization | OrganizationDetails | OrganizationSummary) -> DatabaseRegistry | None:
    """Return the single database registry used by an organization."""

    for application in await applications.list_by_organization(organization.id):
        if application.database_registry is not None:
            return application.database_registry

        if application.database_registry_id is not None:
            registry = await database.get(application.database_registry_id, include_deleted=True)
            if registry is not None:
                return registry

    return await latest_database_registry(organization.location_id)


async def application_storage_registry(application: Application) -> StorageRegistry | None:
    """Return the storage registry used by an application."""

    if application.storage_registry_id is not None:
        return await storage.get(application.storage_registry_id, include_deleted=True)

    return None


def runtime_database_url(database_url: str) -> str:
    """Return a database URL compatible with the SDK runtime."""

    url = make_url(database_url)

    # Runtime applications use the SDK async engine, so PostgreSQL connections use asyncpg.
    if url.drivername != "postgresql+asyncpg":
        url = url.set(drivername="postgresql+asyncpg")

    # sslmode is a libpq/psycopg option; asyncpg receives it as an invalid kwarg through SQLAlchemy.
    sslmode_query_keys = [key for key in url.query if key.lower() == "sslmode"]
    if sslmode_query_keys:
        url = url.difference_update_query(sslmode_query_keys)

    return url.render_as_string(hide_password=False)


def runtime_environment(
    application_slug: str,
    database_url: str,
    storage_registry: StorageRegistry | None,
) -> dict[str, str]:
    """Build platform-managed environment variables for an application runtime."""

    environment = {
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_URL": runtime_database_url(database_url),
        "LONGLINK_DATABASE_SCHEMA": application_slug,
    }

    if storage_registry is not None:
        environment.update(
            {
                "LONGLINK_STORAGE_PROTOCOL": storage_registry.protocol,
                "LONGLINK_STORAGE_ENDPOINT_URL": storage_registry.endpoint_url,
                "LONGLINK_STORAGE_ACCESS_KEY_ID": storage_registry.access_key_id,
                "LONGLINK_STORAGE_SECRET_ACCESS_KEY": storage_registry.secret_access_key,
            }
        )

    return environment


async def sync_organization_users(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    registry: DatabaseRegistry | None = None,
) -> None:
    """Synchronize organization members into the shared users table."""

    database_registry = registry or await organization_database_registry(organization)
    if database_registry is None:
        return

    db_client = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
    )
    database_users = await organizations.database_users(organization.id)
    await db_client.sync_users(organization.slug, database_users)


async def sync_user_organizations(user: User) -> None:
    """Synchronize every organization database affected by one user."""

    for organization in await organizations.list_by_user(user.id):
        await sync_organization_users(organization)


async def create_application_runtime(
    organization: OrganizationDetails,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Create the application row, provision runtime resources, and queue verification."""

    application_slug = names.slugify(payload.name)
    logger.info("Provisioning application %s/%s", organization.slug, application_slug)

    image_metadata = await application_image_metadata(payload)

    compute_registry = await latest_compute_registry(organization.location_id)
    if compute_registry is None:
        raise RuntimeError(f"No compute cluster configured for location '{organization.location_id}'")

    database_registry = await organization_database_registry(organization)
    if database_registry is None:
        raise RuntimeError(f"No database configured for location '{organization.location_id}'")

    storage_registry = await latest_storage_registry(organization.location_id)

    application = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=payload.image,
        compute_registry_id=compute_registry.id,
        database_registry_id=database_registry.id,
        storage_registry_id=storage_registry.id if storage_registry is not None else None,
        version=image_metadata.version if image_metadata is not None else None,
        sdk_version=image_metadata.sdk if image_metadata is not None else None,
        status=ApplicationStatus.creating,
        description=payload.description,
        icon=payload.icon,
        user=user,
    )

    k8s = K8s(compute_registry.kubeconfig, compute_registry.proxy_secret)
    db_client = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        runtime_host=database_registry.runtime_host,
        runtime_port=database_registry.runtime_port,
    )

    # Provision the namespace, schema, and workload in order so failures can mark the application as failed.
    try:
        await k8s.namespace(organization.slug)
        await db_client.sync_users(organization.slug, await organizations.database_users(organization.id))
        database_url = await db_client.schema(organization.slug, application_slug)
        runtime_envs = runtime_environment(application_slug, database_url, storage_registry)
        await k8s.application(
            organization.slug,
            application_slug,
            payload.image,
            APP_SERVICE_PORT,
            {**payload.envs, **runtime_envs},
        )
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        raise RuntimeError("Failed to initialize the application") from exc

    try:
        operation = await operations.create(OperationKind.application_create, application_id=application.id, step="verify", user=user)
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        logger.exception("Failed to queue application verification for %s/%s", organization.slug, payload.name)
        raise RuntimeError("Failed to queue application verification") from exc

    logger.info("Queued application creation verification %s for %s/%s", operation.id, organization.slug, payload.name)
    return application


async def sync_application_runtime(
    application: Application,
    organization: OrganizationDetails,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Update an existing application row and refresh its runtime workload."""

    logger.info("Syncing application %s/%s from image %s", organization.slug, application.slug, payload.image)
    image_metadata = await application_image_metadata(payload)

    compute_registry = await application_compute_registry(application, organization.location_id)
    if compute_registry is None:
        raise RuntimeError(f"No compute cluster configured for location '{organization.location_id}'")

    database_registry = await organization_database_registry(organization)
    if database_registry is None:
        raise RuntimeError(f"No database configured for location '{organization.location_id}'")

    storage_registry = await application_storage_registry(application)
    if storage_registry is None:
        storage_registry = await latest_storage_registry(organization.location_id)

    updated_application = await applications.update_runtime(
        application.id,
        image=payload.image,
        compute_registry_id=compute_registry.id,
        database_registry_id=database_registry.id,
        storage_registry_id=storage_registry.id if storage_registry is not None else None,
        version=image_metadata.version if image_metadata is not None else None,
        sdk_version=image_metadata.sdk if image_metadata is not None else None,
        status=ApplicationStatus.creating,
        description=payload.description,
        icon=payload.icon,
        user=user,
    )
    if updated_application is None:
        raise RuntimeError("Application no longer exists")

    k8s = K8s(compute_registry.kubeconfig, compute_registry.proxy_secret)
    db_client = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        runtime_host=database_registry.runtime_host,
        runtime_port=database_registry.runtime_port,
    )

    # Reapply the workload with a fresh rollout token so fixed development tags pull the newest image.
    try:
        await k8s.namespace(organization.slug)
        await db_client.sync_users(organization.slug, await organizations.database_users(organization.id))
        database_url = await db_client.schema(organization.slug, application.slug)
        runtime_envs = runtime_environment(application.slug, database_url, storage_registry)
        await k8s.application(
            organization.slug,
            application.slug,
            payload.image,
            APP_SERVICE_PORT,
            {**payload.envs, **runtime_envs},
            rollout_token=datetime.now(UTC).isoformat(),
        )
    except Exception as exc:
        await applications.set_status(application.id, ApplicationStatus.failed)
        raise RuntimeError("Failed to refresh the application runtime") from exc

    operation = await operations.create(OperationKind.application_create, application_id=application.id, step="verify", user=user)
    logger.info("Queued application sync verification %s for %s/%s", operation.id, organization.slug, payload.name)
    return updated_application


async def create_organization_namespace(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the organization namespace on the active compute registry."""

    registry = await latest_compute_registry(organization.location_id)
    if registry is None:
        return

    try:
        await K8s(registry.kubeconfig, registry.proxy_secret).namespace(organization.slug)
    except Exception:
        logger.exception("Failed to create namespace for organization '%s'", organization.slug)


async def create_organization_database(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the organization database on the active database registry."""

    registry = await latest_database_registry(organization.location_id)
    if registry is None:
        return

    try:
        db_client = Postgres(registry.host, registry.port, registry.username, registry.password)
        await db_client.database(organization.slug)
        await db_client.sync_users(organization.slug, await organizations.database_users(organization.id))
    except Exception:
        logger.exception("Failed to create database for organization '%s'", organization.slug)
