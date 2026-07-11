from src import adapters
from uuid import UUID
from src.utils import names
from src.runtime import Kubernetes, registries, provisioning
from src.operations import outcomes as outcome
from src.operations import registry
from src.database.services import organizations
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

    # Validate generated runtime resource names before contacting adapters.
    names.namespace(organization.slug)
    names.knames(organization.slug)

    # Load deleted applications so their resources are removed before shared organization resources.
    organization_applications = await organizations.applications(organization.id, include_deleted=True)

    # Delete application-scoped resources before deleting shared organization resources.
    for application in organization_applications:
        await provisioning.remove_application_runtime(application, organization)

    # Track compute registries that need organization-level namespace cleanup.
    compute_registries: list[ComputeRegistry] = []
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
        compute_adapter = Kubernetes(registry.kubeconfig, registry.proxy_secret)
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

    return outcome.complete()
