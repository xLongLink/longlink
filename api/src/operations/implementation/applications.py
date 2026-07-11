from datetime import timedelta
from src.runtime import Kubernetes, startup, provisioning
from tenant.utils import utcnow
from src.operations import outcomes as outcome
from src.operations import registry
from src.models.statuses import ApplicationStatus
from src.runtime.resources import parse_kubernetes_timestamp
from src.database.services import registries, applications, organizations
from src.models.operations import OperationKind
from src.database.models.operations import Operation


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
    if organization is not None:

        # Missing compute registries leave verification pending until timeout.
        registry = await registries.application_compute(application, organization.location_id)
        if registry is not None:
            adapter = Kubernetes(registry.kubeconfig, registry.proxy_secret)
            application_id = str(application.id)

            # Runtime adapters raise while deployments or pods are still being created.
            try:
                # A ready deployment is enough to complete verification without pod inspection.
                if await adapter.application_deployment_ready(organization.slug, application_id):
                    await applications.set_status(application.id, ApplicationStatus.running)
                    return outcome.complete()

                pods = await adapter.application_pods(organization.slug, application_id)

                # Ignore stale pods from older rollouts so they cannot fail a fresh verification operation.
                threshold = operation.created_at - timedelta(seconds=startup.POD_ROLLOUT_GRACE_SECONDS)
                current = None
                for pod in pods:
                    metadata = startup.runtime_value(pod, "metadata")

                    # Parse creation timestamps and keep pods with missing values.
                    pod_created = parse_kubernetes_timestamp(startup.runtime_value(metadata, "creation_timestamp", "creationTimestamp"))
                    if pod_created is None:
                        current = pod
                        break

                    # Only a pod created near this verification operation can decide its result.
                    if pod_created >= threshold:
                        current = pod
                        break

                # Inspect the current pod when Kubernetes has created one for this rollout.
                if current is not None:
                    # Pods without status cannot prove readiness or terminal failure.
                    status = startup.runtime_value(current, "status")
                    if status is not None:
                        containers = startup.runtime_value(status, "container_statuses", "containerStatuses") or []
                        phase = startup.runtime_value(status, "phase")

                        # Kubernetes marks the pod running before every container is necessarily ready.
                        ready = phase == "Running" and bool(containers) and all(startup.runtime_value(container, "ready") for container in containers)

                        if not ready:
                            # Failed or unknown pod phases are terminal for this rollout.
                            dead = phase in {"Failed", "Unknown"}

                            # Container states expose more specific startup failures than the pod phase.
                            for container in containers:

                                # Containers without state have not produced a terminal signal yet.
                                state = startup.runtime_value(container, "state")
                                if state is None:
                                    continue

                                waiting = startup.runtime_value(state, "waiting")
                                reason = startup.runtime_value(waiting, "reason")

                                # Known unrecoverable waiting reasons fail the rollout unless the grace period says otherwise.
                                if reason in startup.FAILED_CONTAINER_WAITING_REASONS:
                                    grace_expired = utcnow() - operation.created_at >= timedelta(seconds=startup.POD_STARTUP_FAILURE_GRACE_SECONDS)

                                    # Crash loops can recover after transient startup dependencies, such as DNS or database readiness.
                                    if reason == "CrashLoopBackOff" and not grace_expired:
                                        continue

                                    dead = True
                                    break

                                # Non-zero container exits are terminal after the startup grace period.
                                terminated = startup.runtime_value(state, "terminated")
                                if terminated is not None and startup.runtime_value(terminated, "exit_code", "exitCode") != 0:
                                    grace_expired = utcnow() - operation.created_at >= timedelta(seconds=startup.POD_STARTUP_FAILURE_GRACE_SECONDS)

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

    await provisioning.remove_application_runtime(application, organization)
    return outcome.complete()
