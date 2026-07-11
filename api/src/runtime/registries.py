from uuid import UUID
from src.database.services import compute, storage, database, organizations
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def latest_compute_registry(location_id: UUID) -> ComputeRegistry | None:
    """Return the newest compute registry for one location."""

    return max(
        (registry for registry in await compute.fetch() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def latest_database_registry(location_id: UUID) -> DatabaseRegistry | None:
    """Return the newest database registry for one location."""

    return max(
        (registry for registry in await database.fetch() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def latest_storage_registry(location_id: UUID) -> StorageRegistry | None:
    """Return the newest storage registry for one location."""

    return max(
        (registry for registry in await storage.fetch() if registry.location_id == location_id),
        key=lambda item: item.created_at,
        default=None,
    )


async def application_compute_registry(application: Application, location_id: UUID) -> ComputeRegistry | None:
    """Return the compute registry used by an application, falling back to the newest one."""

    # Existing applications keep using their assigned compute registry.
    if application.compute_registry_id is not None:
        registry = await compute.get(application.compute_registry_id, include_deleted=True)

        # Ignore dangling ids so the application can fall back to the active location registry.
        if registry is not None:
            return registry

    return await latest_compute_registry(location_id)


async def organization_database_registry(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    include_deleted: bool = False,
) -> DatabaseRegistry | None:
    """Return the single database registry used by an organization."""

    # Reuse the first registry already assigned to an application in the organization.
    for application in await organizations.applications(organization.id, include_deleted=include_deleted):

        # Eager-loaded registry relationships avoid another lookup when available.
        if application.database_registry is not None:
            return application.database_registry

        # Deleted registries are still valid for cleanup flows.
        if application.database_registry_id is not None:
            registry = await database.get(application.database_registry_id, include_deleted=True)

            # Ignore dangling ids so the organization can fall back to the active location registry.
            if registry is not None:
                return registry

    return await latest_database_registry(organization.location_id)


async def organization_storage_registry(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    include_deleted: bool = False,
) -> StorageRegistry | None:
    """Return the single storage registry used by an organization."""

    # Reuse the first registry already assigned to an application in the organization.
    for application in await organizations.applications(organization.id, include_deleted=include_deleted):

        # Eager-loaded registry relationships avoid another lookup when available.
        if application.storage_registry is not None:
            return application.storage_registry

        # Deleted registries are still valid for cleanup flows.
        if application.storage_registry_id is not None:
            registry = await storage.get(application.storage_registry_id, include_deleted=True)

            # Ignore dangling ids so the organization can fall back to the active location registry.
            if registry is not None:
                return registry

    return await latest_storage_registry(organization.location_id)


async def application_storage_registry(application: Application) -> StorageRegistry | None:
    """Return the storage registry used by an application."""

    # Storage is optional, so applications without an assigned registry return no backend.
    if application.storage_registry_id is not None:
        return await storage.get(application.storage_registry_id, include_deleted=True)

    return None
