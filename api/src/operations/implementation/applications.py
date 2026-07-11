from src.operations import registry
from datetime import UTC, datetime, timedelta
from src.runtime import startup
from src.models.statuses import ApplicationStatus
from src.database.services import applications, organizations
from src.models.operations import OperationKind
from src.operations.outcomes import OperationOutcome, complete, defer, fail
from src.runtime import Kubernetes, provisioning, registries
from src.database.models.operations import Operation

APPLICATION_VERIFICATION_TIMEOUT_SECONDS = 15 * 60


@registry.operation_handler(OperationKind.application_verify)
async def verify(operation: Operation) -> OperationOutcome:
    """Verify one application runtime startup."""

    # Application verification operations must reference the application row.
    application_id = operation.application_id
    if application_id is None:
        raise ValueError("Operation missing application reference")

    # Load the application row required by the verification operation.
    application = await applications.get(application_id)
    if application is None:
        raise ValueError(f"Application '{application_id}' not found")

    startup_state = startup.ApplicationStartupState.pending

    # Missing organizations or compute registries leave verification pending until timeout.
    organization = await organizations.get(application.organization_id)
    if organization is not None:
        compute_registry = await registries.application_compute_registry(application, organization.location_id)

        if compute_registry is not None:
            compute_adapter = Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret)

            # A ready deployment is enough to complete verification without pod inspection.
            try:
                if await compute_adapter.application_deployment_ready(organization.slug, application.slug):
                    startup_state = startup.ApplicationStartupState.ready
                else:
                    pods = await compute_adapter.application_pods(organization.slug, application.slug)
                    startup_state = startup.application_pods_startup_state(pods, operation.created_at)

            # Runtime adapters raise while deployments or pods are still being created.
            except RuntimeError:
                startup_state = startup.ApplicationStartupState.pending

    # Ready applications move to running and complete the operation.
    if startup_state == startup.ApplicationStartupState.ready:
        await applications.set_status(application.id, ApplicationStatus.running)
        return complete()

    # Dead applications fail both the application row and the operation.
    if startup_state == startup.ApplicationStartupState.dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return fail("Application crashed during startup")

    # Pending applications eventually fail if they never become ready.
    operation_created_at = operation.created_at
    if operation_created_at.tzinfo is None:
        operation_created_at = operation_created_at.replace(tzinfo=UTC)
    if datetime.now(UTC) - operation_created_at >= timedelta(seconds=APPLICATION_VERIFICATION_TIMEOUT_SECONDS):
        await applications.set_status(application.id, ApplicationStatus.failed)
        return fail("Application startup verification timed out")

    return defer()


@registry.operation_handler(OperationKind.application_remove)
async def remove(operation: Operation) -> OperationOutcome:
    """Remove runtime resources for one deleted application."""

    # Application removal operations must reference the application row.
    if operation.application_id is None:
        raise ValueError("Operation missing application reference")

    # Look up deleted records before deciding whether runtime resources remain.
    application = await applications.get(operation.application_id, include_deleted=True)
    if application is None:
        return complete()

    # Look up the deleted organization before removing namespace resources.
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None:
        return complete()

    await provisioning.remove_application_runtime(application, organization)
    return complete()
