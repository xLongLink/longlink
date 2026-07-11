from src.operations import registry
from src.runtime import startup
from src.models.statuses import ApplicationStatus
from src.database.services import applications, organizations
from src.models.operations import OperationKind
from src.operations.outcomes import OperationOutcome, complete, defer, fail
from src.runtime import provisioning
from src.database.models.operations import Operation


@registry.operation_handler(OperationKind.application_verify)
async def verify(operation: Operation) -> OperationOutcome:
    """Verify one application runtime startup."""

    application_id = operation.application_id

    # Application verification operations must reference the application row.
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id)

    # A missing application is an invalid operation payload.
    if application is None:
        raise ValueError(f"Application '{application_id}' not found")

    startup_state = await startup.inspect_application_startup(operation, application)

    # Ready applications move to running and complete the operation.
    if startup_state == startup.ApplicationStartupState.ready:
        await applications.set_status(application.id, ApplicationStatus.running)
        return complete()

    # Dead applications fail both the application row and the operation.
    if startup_state == startup.ApplicationStartupState.dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return fail("Application crashed during startup")

    # Pending applications eventually fail if they never become ready.
    if startup.application_verification_timed_out(operation.created_at):
        await applications.set_status(application.id, ApplicationStatus.failed)
        return fail("Application startup verification timed out")

    return defer()


@registry.operation_handler(OperationKind.application_remove)
async def remove(operation: Operation) -> OperationOutcome:
    """Remove runtime resources for one deleted application."""

    application_id = operation.application_id

    # Application removal operations must reference the application row.
    if application_id is None:
        raise ValueError("Operation missing application reference")

    application = await applications.get_by_id(application_id, include_deleted=True)

    # Missing applications have no runtime resources to remove.
    if application is None:
        return complete()

    organization = await organizations.get_record(application.organization_id, include_deleted=True)

    # Missing organizations imply the namespace-level resources are already gone.
    if organization is None:
        return complete()

    await provisioning.remove_application_runtime(application, organization)
    return complete()
