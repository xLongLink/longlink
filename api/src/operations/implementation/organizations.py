from src.operations import registry
from src.database.services import organizations
from src.models.operations import OperationKind
from src.operations.outcomes import OperationOutcome, complete
from src.runtime import provisioning
from src.database.models.operations import Operation


@registry.operation_handler(OperationKind.organization_remove)
async def remove(operation: Operation) -> OperationOutcome:
    """Remove runtime resources for one deleted organization."""

    organization_id = operation.organization_id

    # Organization removal operations must reference the organization row.
    if organization_id is None:
        raise ValueError("Operation missing organization reference")

    organization = await organizations.get_record(organization_id, include_deleted=True)

    # Missing organizations have no runtime resources to remove.
    if organization is None:
        return complete()

    await provisioning.remove_organization_runtime(organization)
    return complete()
