from uuid import UUID

from sqlalchemy.engine import make_url
from src.logger import logger
from src.constants import APP_SERVICE_PORT
from src.utils import images, names
from src.adapters.compute.k8s import K8s
from src.adapters.database import Postgres
from src.adapters.storage import S3
from src.models.operations import OperationKind
from src.models.statuses import ApplicationStatus
from src.models.applications import ApplicationCreate
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.applications import Application
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.storage import storage
from src.database.services.operations import operations
from src.database.services.applications import applications


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


async def application_compute_registry(application: Application, location_id: UUID) -> ComputeRegistry | None:
    """Return the compute registry used by an application, falling back to the newest one."""

    if application.compute_registry_id is not None:
        return await compute.get(application.compute_registry_id)

    return await latest_compute_registry(location_id)


async def application_database_registry(application: Application, location_id: UUID) -> DatabaseRegistry | None:
    """Return the database registry used by an application, falling back to the newest one."""

    if application.database_registry_id is not None:
        return await database.get(application.database_registry_id)

    return await latest_database_registry(location_id)


async def application_storage_registry(application: Application) -> StorageRegistry | None:
    """Return the storage registry used by an application."""

    if application.storage_registry_id is not None:
        return await storage.get(application.storage_registry_id)

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


async def create_application_runtime(
    organization: OrganizationDetails,
    payload: ApplicationCreate,
    user: User,
) -> Application:
    """Create the application row, provision runtime resources, and queue verification."""

    application_slug = names.slugify(payload.name)
    logger.info("Provisioning application %s/%s", organization.slug, application_slug)

    image_metadata = await images.metadata(payload.image)
    compute_registry = await latest_compute_registry(organization.location_id)
    if compute_registry is None:
        raise RuntimeError(f"No compute cluster configured for location '{organization.location_id}'")

    database_registry = await latest_database_registry(organization.location_id)
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
    )

    # Provision the namespace, schema, and workload in order so failures can mark the application as failed.
    try:
        await k8s.namespace(organization.slug)
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


async def delete_application_runtime(application: Application, organization: OrganizationDetails) -> None:
    """Remove the runtime resources owned by one application."""

    compute_registry = await application_compute_registry(application, organization.location_id)
    if compute_registry is None:
        raise RuntimeError(f"No compute cluster configured for location '{organization.location_id}'")

    database_registry = await application_database_registry(application, organization.location_id)
    if database_registry is None:
        raise RuntimeError(f"No database configured for location '{organization.location_id}'")

    storage_registry = await application_storage_registry(application)
    k8s = K8s(compute_registry.kubeconfig, compute_registry.proxy_secret)
    db_client = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
    )

    try:
        await k8s.remove(organization.slug, application.slug)
        await db_client.remove(organization.slug, application.slug)
        if storage_registry is not None:
            storage_client = S3(
                storage_registry.protocol,
                storage_registry.endpoint_url,
                storage_registry.access_key_id,
                storage_registry.secret_access_key,
            )
            await storage_client.remove(organization.slug, application.slug)
    except Exception as exc:
        logger.exception("Failed to remove runtime for %s/%s", organization.slug, application.slug)
        raise RuntimeError("Failed to remove the application runtime") from exc


async def queue_application_delete(application_id: UUID, user: User) -> Application | None:
    """Mark one application as deleting and queue runtime removal."""

    application = await applications.get_by_id(application_id)
    if application is None:
        return None

    await applications.set_status(application.id, ApplicationStatus.deleting)
    try:
        await operations.create(OperationKind.application_delete, application_id=application.id, step="remove_runtime", user=user)
    except Exception as exc:
        await applications.set_status(application.id, application.status)
        logger.exception("Failed to queue application deletion for %s", application.name)
        raise RuntimeError("Failed to queue application deletion") from exc

    return application


async def create_organization_namespace(organization: OrganizationSummary) -> None:
    """Best-effort create the organization namespace on the active compute registry."""

    registry = await latest_compute_registry(organization.location_id)
    if registry is None:
        return

    try:
        await K8s(registry.kubeconfig, registry.proxy_secret).namespace(organization.slug)
    except Exception:
        logger.exception("Failed to create namespace for organization '%s'", organization.slug)


async def delete_organization_namespace(organization: OrganizationDetails) -> None:
    """Best-effort delete the organization namespace on the active compute registry."""

    registry = await latest_compute_registry(organization.location_id)
    if registry is None:
        return

    try:
        await K8s(registry.kubeconfig, registry.proxy_secret).delete(organization.slug)
    except Exception:
        logger.exception("Failed to delete namespace for organization '%s'", organization.slug)
