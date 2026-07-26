from src import adapters
from src.utils import jobs
from src.utils.jobs import operation
from src.database.services import storage, organizations
from src.database.models.operations import Operation


@operation("storage")
async def reconcile(operation: Operation) -> jobs.OperationOutcome:
    """Synchronize one Organization shared storage folder."""

    # Deleted Organizations are cleanup work, not release migration targets.
    organization = await organizations.get(operation.target_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        return jobs.complete()

    # Resolve the immutable storage assignment used by this Organization.
    registry = await storage.get(organization.storage_id, include_deleted=True)
    if registry is None:
        return jobs.fail("Storage registry not found")
    object_storage = adapters.storage(registry)
    bucket = organization.id.hex

    # Converge the bucket and idempotent shared folder marker independently.
    await object_storage.create(bucket)
    await object_storage.create_prefix(bucket, "shared/")
    return jobs.complete()
