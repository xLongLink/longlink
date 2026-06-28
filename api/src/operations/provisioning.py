from uuid import UUID

from src.logger import logger
from src.constants import APP_SERVICE_PORT
from src.utils import images, names
from src.adapters.compute.k8s import K8s
from src.adapters.database import Postgres
from src.models.operations import OperationKind
from src.models.statuses import ApplicationStatus
from src.models.applications import ApplicationCreate
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.services.compute import compute
from src.database.services.database import database
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

    application = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=payload.image,
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
        await db_client.schema(organization.slug, application_slug)
        await k8s.application(organization.slug, application_slug, payload.image, APP_SERVICE_PORT, payload.envs)
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
