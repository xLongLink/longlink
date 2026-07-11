from src import adapters
from uuid import UUID
from src.runtime import Kubernetes, provisioning
from src.operations import outcomes as outcome
from src.operations import registry
from src.database.services import registries, organizations
from src.models.operations import OperationKind
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

    # Delete application-scoped resources before deleting shared organization resources.
    for app in apps:
        await provisioning.remove_application_runtime(app, organization)

    # Track compute registries that need organization-level namespace cleanup.
    computes: list[ComputeRegistry] = []
    seen: set[UUID] = set()

    # Collect every compute registry that may still contain organization resources.
    for app in apps:
        compute = await registries.application_compute(app, organization.location_id)

        # Deduplicate registries so namespace deletion runs once per backend.
        if compute is not None and compute.id not in seen:
            computes.append(compute)
            seen.add(compute.id)

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
    if registry is not None and organization.shared_storage_bucket_name is not None:
        adapter = adapters.storage(registry)
        await adapter.delete_bucket(organization.shared_storage_bucket_name)

    return outcome.complete()
