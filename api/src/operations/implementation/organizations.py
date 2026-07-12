from src import adapters
from uuid import UUID
from src.utils import names
from src.operations import outcomes as outcome
from src.operations import registry
from src.database.services import database, registries, organizations
from src.models.operations import OperationKind
from src.runtime.kubernetes import Kubernetes
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


@registry.operation_handler(OperationKind.organization_remove)
async def remove(operation: Operation) -> outcome.OperationOutcome:
    """Remove runtime resources for one deleted organization."""

    # Organization removal operations must reference the organization row.
    organization_id = operation.organization_id
    if organization_id is None:
        raise ValueError("Operation missing organization reference")

    # Look up the deleted organization before removing runtime resources.
    organization = await organizations.get(organization_id, include_deleted=True)
    if organization is None:
        return outcome.complete()

    # Load deleted applications so their resources are removed before shared organization resources.
    apps = await organizations.applications(organization.id, include_deleted=True)

    # Track compute registries that need organization-level namespace cleanup.
    computes: list[ComputeRegistry] = []
    seen: set[UUID] = set()

    # Delete application-scoped resources before deleting shared organization resources.
    for app in apps:
        # Remove workload resources only when the app has a compute backend to target.
        registry = await registries.application_compute(app, organization.location_id)
        if registry is not None:
            adapter = Kubernetes(registry.kubeconfig, registry.proxy_secret)
            await adapter.delete(str(app.id))

            # Deduplicate registries so namespace deletion runs once per backend.
            if registry.id not in seen:
                computes.append(registry)
                seen.add(registry.id)

        # Remove the application schema from the database registry that originally hosted it.
        if app.database_registry_id is not None:
            # Missing registries are tolerated during cleanup because resources may already be gone.
            registry = await database.get(app.database_registry_id, include_deleted=True)
            if registry is not None:
                adapter = adapters.database(registry)
                await adapter.delete_schema(
                    organization.slug,
                    names.application_schema(app.slug),
                    organization_id=organization.id,
                    application_id=app.id,
                )

        # Remove the deterministic application bucket only when storage was assigned.
        registry = await registries.application_storage(app)
        if registry is not None:
            adapter = adapters.storage(registry)
            await adapter.delete_bucket(names.application_bucket(organization.slug, app.slug))

    current = await registries.compute(organization.location_id, include_deleted=True)

    # Include the current location registry for organizations created before any applications existed.
    if current is not None and current.id not in seen:
        computes.append(current)
        seen.add(current.id)

    # Namespace deletion removes shared gateway/runtime resources for the organization.
    for compute in computes:
        adapter = Kubernetes(compute.kubeconfig, compute.proxy_secret)
        await adapter.delete_namespace(organization.slug)

    registry = await registries.database(organization.location_id, include_deleted=True)

    # Delete the tenant database after app schemas have been removed.
    if registry is not None:
        adapter = adapters.database(registry)
        await adapter.delete_database(organization.slug)

    registry = await registries.storage(organization.location_id, include_deleted=True)

    # Delete the shared bucket only when one was assigned.
    if registry is not None:
        adapter = adapters.storage(registry)
        await adapter.delete_bucket(names.organization_shared_bucket(organization.slug))

    return outcome.complete()
