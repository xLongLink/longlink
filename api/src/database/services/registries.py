from uuid import UUID
from src.database.services import compute as computes
from src.database.services import storage as storages
from src.database.services import database as databases
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application


async def compute(location_id: UUID, include_deleted: bool = False) -> ComputeRegistry | None:
    """Return the compute registry assigned to one location."""

    return await computes.location(location_id, include_deleted=include_deleted)


async def database(location_id: UUID, include_deleted: bool = False) -> DatabaseRegistry | None:
    """Return the database registry assigned to one location."""

    return await databases.location(location_id, include_deleted=include_deleted)


async def storage(location_id: UUID, include_deleted: bool = False) -> StorageRegistry | None:
    """Return the storage registry assigned to one location."""

    return await storages.location(location_id, include_deleted=include_deleted)


async def application_compute(application: Application, location_id: UUID) -> ComputeRegistry | None:
    """Return the compute registry used by an application, falling back to its location."""

    # Existing applications keep using their assigned compute registry.
    if application.compute_registry_id is not None:
        registry = await computes.get(application.compute_registry_id, include_deleted=True)

        # Ignore dangling ids so the application can fall back to the location registry.
        if registry is not None:
            return registry

    return await compute(location_id)


async def application_storage(application: Application) -> StorageRegistry | None:
    """Return the storage registry used by an application."""

    # Storage is optional, so applications without an assigned registry return no backend.
    if application.storage_registry_id is not None:
        return await storages.get(application.storage_registry_id, include_deleted=True)

    return None
