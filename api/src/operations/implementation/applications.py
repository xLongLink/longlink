from src import adapters
from datetime import timedelta
from src.utils import names
from tenant.utils import utcnow
from src.operations import outcomes as outcome
from src.operations import registry
from src.models.statuses import ApplicationStatus
from src.database.services import database, registries, applications, organizations
from src.models.operations import OperationKind
from src.runtime.kubernetes import Kubernetes
from src.database.models.operations import Operation

POD_STARTUP_FAILURE_GRACE_SECONDS = 2 * 60
FAILED_CONTAINER_WAITING_REASONS = {
    "CrashLoopBackOff",
    "CreateContainerConfigError",
    "CreateContainerError",
    "ErrImagePull",
    "ImagePullBackOff",
    "InvalidImageName",
    "RunContainerError",
}


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

    # Track runtime signals observed during this verification attempt.
    ready = False
    dead = False

    # Missing organizations leave verification pending until timeout.
    organization = await organizations.get(application.organization_id)
    if organization is None:
        expired = utcnow() - operation.created_at >= timedelta(seconds=15 * 60)
        if expired:
            await applications.set_status(application.id, ApplicationStatus.failed)
            return outcome.fail("Application startup verification timed out")

        return outcome.defer()

    # Missing compute registries leave verification pending until timeout.
    registry = await registries.application_compute(application, organization.location_id)
    if registry is not None:
        adapter = Kubernetes(registry.kubeconfig, registry.proxy_secret)
        application_id = str(application.id)

        # Runtime adapters raise while deployments or pods are still being created.
        try:
            # A ready deployment is enough to complete verification without pod inspection.
            if await adapter.ready(application_id):
                await applications.set_status(application.id, ApplicationStatus.running)
                return outcome.complete()

            current = await adapter.pod(application_id)

            # Inspect the current pod when Kubernetes has created one for this rollout.
            if current is not None:
                status = current.raw.get("status", {})
                containers = status.get("containerStatuses", [])
                phase = status.get("phase")

                # Kubernetes marks the pod running before every container is necessarily ready.
                ready = phase == "Running" and bool(containers) and all(container.get("ready") for container in containers)

                if not ready:
                    # Failed or unknown pod phases are terminal for this rollout.
                    dead = phase in {"Failed", "Unknown"}

                    # Container states expose more specific startup failures than the pod phase.
                    for container in containers:
                        state = container.get("state", {})
                        waiting = state.get("waiting", {})
                        reason = waiting.get("reason")

                        # Known unrecoverable waiting reasons fail the rollout unless the grace period says otherwise.
                        if reason in FAILED_CONTAINER_WAITING_REASONS:
                            grace_expired = utcnow() - operation.created_at >= timedelta(seconds=POD_STARTUP_FAILURE_GRACE_SECONDS)

                            # Crash loops can recover after transient startup dependencies, such as DNS or database readiness.
                            if reason == "CrashLoopBackOff" and not grace_expired:
                                continue

                            dead = True
                            break

                        terminated = state.get("terminated")

                        # Non-zero container exits are terminal after the startup grace period.
                        if terminated is not None and terminated.get("exitCode") != 0:
                            grace_expired = utcnow() - operation.created_at >= timedelta(seconds=POD_STARTUP_FAILURE_GRACE_SECONDS)

                            # Early exits may be transient while dependencies finish starting.
                            if not grace_expired:
                                continue

                            dead = True
                            break

        except RuntimeError:
            # Runtime creation is still pending.
            pass

    # Ready applications move to running and complete the operation.
    if ready:
        await applications.set_status(application.id, ApplicationStatus.running)
        return outcome.complete()

    # Dead applications fail both the application row and the operation.
    if dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return outcome.fail("Application crashed during startup")

    # Pending applications eventually fail if they never become ready.
    expired = utcnow() - operation.created_at >= timedelta(seconds=15 * 60)
    if expired:
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

    # Remove workload resources only when the app has a compute backend to target.
    registry = await registries.application_compute(application, organization.location_id)
    if registry is not None:
        adapter = Kubernetes(registry.kubeconfig, registry.proxy_secret)
        await adapter.delete(str(application.id))

    # Remove the application schema from the database registry that originally hosted it.
    if application.database_registry_id is not None:
        # Missing registries are tolerated during cleanup because resources may already be gone.
        registry = await database.get(application.database_registry_id, include_deleted=True)
        if registry is not None:
            adapter = adapters.database(registry)
            await adapter.delete_schema(organization.id, application.id)

    # Remove the deterministic application bucket only when storage was assigned.
    registry = await registries.application_storage(application)
    if registry is not None:
        adapter = adapters.storage(registry)
        credentials = applications.storage_runtime_credentials(application)
        if credentials is not None:
            await adapter.revoke_runtime_credentials(credentials)

        await adapter.delete_bucket(names.application_bucket(organization.slug, application.slug))

    return outcome.complete()
