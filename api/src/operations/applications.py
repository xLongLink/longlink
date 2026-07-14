from src import adapters
from datetime import timedelta
from src.utils import jobs, names
from longlink.utils.time import utcnow
from src.models.statuses import ApplicationStatus
from src.database.services import compute, storage, database, applications, organizations
from src.kubernetes.client import Kubernetes
from src.models.operations import OperationKind
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


@jobs.operation_handler(OperationKind.application_verify)
async def verify(operation: Operation) -> jobs.OperationOutcome:
    """Wait for one application runtime to finish starting."""

    # Application verification operations must reference the application row.
    if operation.application_id is None:
        raise ValueError("Operation missing application reference")

    # Load the application row required by the verification operation.
    application = await applications.get(operation.application_id)
    if application is None:
        raise ValueError(f"Application '{operation.application_id}' not found")

    # Load the owning organization and assigned compute registry.
    organization = await organizations.get(application.organization_id)
    if organization is None:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application organization not found")

    # Prefer the application's assigned compute registry and fall back when the assignment is absent or dangling.
    registry = None
    if application.compute_registry_id is not None:
        registry = await compute.get(application.compute_registry_id, include_deleted=True)
    if registry is None:
        registry = await compute.location(organization.location_id)
    if registry is None:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application compute registry not found")

    compute_client = Kubernetes(registry.kubeconfig, registry.proxy_secret)
    application_id = str(application.id)

    # Track terminal runtime signals observed during this verification attempt.
    dead = False

    # Unexpected cluster failures are terminal; absent or pending resources return normal values.
    try:
        # A ready deployment is enough to complete verification without pod inspection.
        if await compute_client.applications.ready(application_id):
            await applications.set_status(application.id, ApplicationStatus.running)
            return jobs.complete()

        current = await compute_client.applications.pod(application_id)

        # Inspect the current pod when Kubernetes has created one for this rollout.
        if current is not None:
            status = current.raw.get("status", {})
            containers = status.get("containerStatuses", [])
            phase = status.get("phase")

            # Pod state is diagnostic only; Deployment readiness is the authoritative success signal.
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

    except Exception:
        await applications.set_status(application.id, ApplicationStatus.failed)
        raise

    # Dead applications fail both the application row and the operation.
    if dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application crashed during startup")

    # Pending applications eventually fail if they never become ready.
    expired = utcnow() - operation.created_at >= timedelta(seconds=15 * 60)
    if expired:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application startup verification timed out")

    return jobs.defer()


@jobs.operation_handler(OperationKind.application_remove)
async def remove(operation: Operation) -> jobs.OperationOutcome:
    """Remove runtime resources for one deleted application."""

    # Application removal operations must reference the application row.
    if operation.application_id is None:
        raise ValueError("Operation missing application reference")

    # Look up deleted records before deciding whether runtime resources remain.
    application = await applications.get(operation.application_id, include_deleted=True)
    if application is None:
        return jobs.complete()

    # Look up the deleted organization before removing namespace resources.
    organization = await organizations.get(application.organization_id, include_deleted=True)
    if organization is None:
        return jobs.complete()

    # Remove workload resources only when the app has a compute backend to target.
    # Prefer the application's assigned compute registry and fall back when the assignment is absent or dangling.
    registry = None
    if application.compute_registry_id is not None:
        registry = await compute.get(application.compute_registry_id, include_deleted=True)
    if registry is None:
        registry = await compute.location(organization.location_id)
    if registry is not None:
        adapter = Kubernetes(registry.kubeconfig, registry.proxy_secret)
        await adapter.applications.delete(str(application.id))

    # Remove the application schema from the database registry that originally hosted it.
    if application.database_registry_id is not None:
        # Missing registries are tolerated during cleanup because resources may already be gone.
        registry = await database.get(application.database_registry_id, include_deleted=True)
        if registry is not None:
            adapter = adapters.database(registry)
            await adapter.delete_schema(organization.id, application.id)

    # Remove the deterministic application bucket only when storage was assigned.
    registry = None
    if application.storage_registry_id is not None:
        registry = await storage.get(application.storage_registry_id, include_deleted=True)
    if registry is not None:
        adapter = adapters.storage(registry)
        bucket = names.application_bucket(application.id)
        await adapter.revoke(bucket)
        await adapter.delete(bucket)

    return jobs.complete()
