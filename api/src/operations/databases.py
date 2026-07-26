from src import adapters, projections
from src.utils import jobs
from src.utils.jobs import operation
from src.database.services import database, operations, organizations
from src.database.models.operations import Operation


@operation("database")
async def reconcile(operation: Operation) -> jobs.OperationOutcome:
    """Migrate and synchronize one Organization shared database schema."""

    # Every external mutation is fenced by the unexpired lease claimed for this attempt.
    attempt_count = operation.attempt_count
    if attempt_count < 1 or operation.lease_expires_at is None:
        raise ValueError("Database migration requires a claimed operation")

    async def fence() -> None:
        """Reject provider work after another worker can own this operation."""

        if not await operations.lease_is_current(operation.id, attempt_count):
            raise RuntimeError(f"Operation '{operation.id}' lease was lost")

    # Deleted Organizations are cleanup work, not release migration targets.
    organization = await organizations.get(operation.target_id, include_deleted=True)
    if organization is None or organization.deleted_at is not None:
        return jobs.complete()
    if organization.compute_id != operation.compute_id:
        return jobs.fail("Organization does not match operation compute")

    # Resolve the immutable database assignment used by this Organization.
    registry = await database.get(organization.database_id, include_deleted=True)
    if registry is None:
        return jobs.fail("Database registry not found")
    db = adapters.Postgres(registry.host, registry.port, registry.username, registry.password, registry.sslmode)

    # Migrate the SDK-owned shared schema before synchronizing its Platform-owned user rows.
    await fence()
    await db.prepare_organization_database(organization.id, organization.shared_schema_url)
    await fence()
    await projections.sync_organization_users(organization)
    return jobs.complete()
