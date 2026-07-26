from src import adapters
from src.utils import jobs, names
from src.utils.jobs import operation
from src.database.services import storage, operations, organizations
from src.database.models.operations import Operation


@operation("storage")
async def reconcile(operation: Operation) -> jobs.OperationOutcome:
    """Synchronize one Organization shared storage folder."""

    # Every external mutation is fenced by the unexpired lease claimed for this attempt.
    attempt_count = operation.attempt_count
    if attempt_count < 1 or operation.lease_expires_at is None:
        raise ValueError("Storage migration requires a claimed operation")

    async def fence() -> None:
        """Reject provider work after another worker can own this operation."""

        if not await operations.lease_is_current(operation.id, attempt_count):
            raise jobs.OperationLeaseLost(operation.id)

    # Deleted Organizations are cleanup work, not release migration targets.
    organization = await organizations.get(operation.target_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        return jobs.complete()
    if organization.compute_id != operation.compute_id:
        return jobs.fail("Organization does not match operation compute")

    # Resolve the immutable storage assignment used by this Organization.
    registry = await storage.get(organization.storage_id, include_deleted=True)
    if registry is None:
        return jobs.fail("Storage registry not found")
    object_storage = adapters.storage(registry)
    bucket = names.organization_bucket(organization.id)

    # Converge the bucket and idempotent shared folder marker independently.
    await fence()
    await object_storage.create(bucket)
    await fence()
    await object_storage.create_prefix(bucket, names.shared_storage_prefix())
    return jobs.complete()
