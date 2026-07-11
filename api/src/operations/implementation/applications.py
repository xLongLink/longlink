from datetime import UTC, timedelta
from src.runtime import Kubernetes, startup, registries, provisioning
from tenant.utils import utcnow
from src.operations import outcomes as outcome
from src.operations import registry
from src.models.statuses import ApplicationStatus
from src.database.services import applications, organizations
from src.models.operations import OperationKind
from src.database.models.operations import Operation

APPLICATION_VERIFICATION_TIMEOUT_SECONDS = 15 * 60


@registry.operation_handler(OperationKind.application_verify)
async def verify(operation: Operation) -> outcome.OperationOutcome:
    """Verify one application runtime startup."""

    # Application verification operations must reference the application row.
    if operation.application_id is None:
        raise ValueError("Operation missing application reference")

    # Load the application row required by the verification operation.
    application = await applications.get(operation.application_id)
    if application is None:
        raise ValueError(f"Application '{operation.application_id}' not found")

    # Normalize database timestamps before comparing them with Kubernetes UTC timestamps.
    operation_created_at = operation.created_at
    if operation_created_at.tzinfo is None:
        operation_created_at = operation_created_at.replace(tzinfo=UTC)

    # Pending applications eventually fail if they never become ready.
    startup_timeout_elapsed = utcnow() - operation_created_at >= timedelta(seconds=APPLICATION_VERIFICATION_TIMEOUT_SECONDS)

    # Missing organizations leave verification pending until timeout.
    organization = await organizations.get(application.organization_id)
    if organization is None:
        if startup_timeout_elapsed:
            await applications.set_status(application.id, ApplicationStatus.failed)
            return outcome.fail("Application startup verification timed out")

        return outcome.defer()

    # Missing compute registries leave verification pending until timeout.
    compute_registry = await registries.application_compute_registry(application, organization.location_id)
    if compute_registry is None:
        if startup_timeout_elapsed:
            await applications.set_status(application.id, ApplicationStatus.failed)
            return outcome.fail("Application startup verification timed out")

        return outcome.defer()

    compute_adapter = Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret)

    # Runtime adapters raise while deployments or pods are still being created.
    try:
        # A ready deployment is enough to complete verification without pod inspection.
        if await compute_adapter.application_deployment_ready(organization.slug, application.slug):
            await applications.set_status(application.id, ApplicationStatus.running)
            return outcome.complete()

        pods = await compute_adapter.application_pods(organization.slug, application.slug)

    except RuntimeError:
        if startup_timeout_elapsed:
            await applications.set_status(application.id, ApplicationStatus.failed)
            return outcome.fail("Application startup verification timed out")

        return outcome.defer()

    state = startup.application_pods_startup_state(pods, operation_created_at)

    # Ready applications move to running and complete the operation.
    if state == startup.ApplicationStartupState.ready:
        await applications.set_status(application.id, ApplicationStatus.running)
        return outcome.complete()

    # Dead applications fail both the application row and the operation.
    if state == startup.ApplicationStartupState.dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return outcome.fail("Application crashed during startup")

    if startup_timeout_elapsed:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return outcome.fail("Application startup verification timed out")

    return outcome.defer()


@registry.operation_handler(OperationKind.application_remove)
async def remove(operation: Operation) -> outcome.OperationOutcome:
    """Remove runtime resources for one deleted application."""

    # Application removal operations must reference the application row.
    if operation.application_id is None:
        raise ValueError("Operation missing application reference")

    # Look up deleted records before deciding whether runtime resources remain.
    application = await applications.get(operation.application_id, include_deleted=True)
    if application is None:
        return outcome.complete()

    # Look up the deleted organization before removing namespace resources.
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None:
        return outcome.complete()

    await provisioning.remove_application_runtime(application, organization)
    return outcome.complete()
