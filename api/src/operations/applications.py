import asyncio
from src import adapters
from datetime import timedelta
from src.utils import jobs, names, images
from longlink.shared import users as shared_users
from src.models.statuses import ApplicationStatus
from longlink.tenant.utils import utcnow
from src.database.services import database, operations, registries, applications, organizations
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


@jobs.operation_handler(OperationKind.application_create)
async def create(operation: Operation) -> jobs.OperationOutcome:
    """Create one application runtime and wait for startup."""

    # Application creation operations must reference the application row.
    if operation.application_id is None:
        raise ValueError("Operation missing application reference")

    # Load the application row required by the creation operation.
    application = await applications.get(operation.application_id)
    if application is None:
        raise ValueError(f"Application '{operation.application_id}' not found")

    # Load the owning organization and assigned compute registry.
    organization = await organizations.get(application.organization_id)
    if organization is None:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application organization not found")

    registry = await registries.application_compute(application, organization.location_id)
    if registry is None:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application compute registry not found")

    compute = Kubernetes(registry.kubeconfig, registry.proxy_secret)
    application_id = str(application.id)

    # The first operation attempt creates every external runtime resource.
    if operation.scheduled_at is None:

        # Provisioning requires immutable image metadata and assigned database and storage registries.
        if application.digest is None or application.database_registry_id is None or application.storage_registry_id is None:
            await applications.set_status(application.id, ApplicationStatus.failed)
            return jobs.fail("Application runtime configuration is incomplete")

        database_registry, storage_registry = await asyncio.gather(
            database.get(application.database_registry_id, include_deleted=True),
            registries.application_storage(application),
        )
        if database_registry is None or storage_registry is None or organization.shared_schema_url is None:
            await applications.set_status(application.id, ApplicationStatus.failed)
            return jobs.fail("Application runtime registry not found")

        db = adapters.database(database_registry)
        storage = adapters.storage(storage_registry)
        bucket = names.application_bucket(organization.slug, application.slug)
        shared = names.organization_shared_bucket(organization.slug)

        # Create independent namespace, schema, storage, and user inputs concurrently.
        try:
            connection, organization_users, _, _, _ = await asyncio.gather(
                db.schema(organization.id, application.id),
                organizations.database_users(organization.id),
                compute.namespace(organization.slug),
                storage.create(shared),
                storage.create(bucket),
            )
            await shared_users.sync_url(organization.shared_schema_url, organization_users)

            # Reuse stored runtime credentials or create provider-scoped credentials for this application.
            credentials = applications.storage_runtime_credentials(application)
            if credentials is None:
                credentials = await storage.credentials(bucket, "write")

                # Persist generated credentials before applying the workload so cleanup can revoke them.
                try:
                    persisted = await applications.set_storage_runtime_credentials(application.id, credentials)
                except Exception:
                    await storage.revoke(bucket)
                    raise

                if persisted is None:
                    await storage.revoke(bucket)
                    raise RuntimeError("Application no longer exists")

            reference = images.parse_reference(application.image)
            runtime_image = f"{reference.registry}/{reference.repository}@{application.digest}"
            envs = {
                "LONGLINK_ENV": "production",
                "LONGLINK_DATABASE_HOST": connection["host"],
                "LONGLINK_DATABASE_NAME": connection["database_name"],
                "LONGLINK_DATABASE_PASSWORD": connection["password"],
                "LONGLINK_DATABASE_PORT": str(connection["port"]),
                "LONGLINK_DATABASE_SCHEMA": application.id.hex,
                "LONGLINK_DATABASE_USERNAME": connection["username"],
                "LONGLINK_STORAGE_BUCKET": bucket,
                "LONGLINK_STORAGE_ENDPOINT_URL": storage_registry.runtime_endpoint_url or storage_registry.endpoint_url,
                "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
                "LONGLINK_STORAGE_SHARED_BUCKET": shared,
                "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
            }
            await compute.create(organization.slug, application_id, runtime_image, {**application.envs, **envs})

        # Failed external provisioning marks the application failed and queues partial cleanup.
        except Exception:
            await applications.set_status(application.id, ApplicationStatus.failed)
            await operations.create(OperationKind.application_remove, application_id=application.id)
            raise

    # Track runtime signals observed during this creation attempt.
    ready = False
    dead = False

    # Runtime adapters raise while deployments or pods are still being created.
    try:
        # A ready deployment is enough to complete creation without pod inspection.
        if await compute.ready(application_id):
            await applications.set_status(application.id, ApplicationStatus.running)
            return jobs.complete()

        current = await compute.pod(application_id)

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
        return jobs.complete()

    # Dead applications fail both the application row and the operation.
    if dead:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application crashed during startup")

    # Pending applications eventually fail if they never become ready.
    expired = utcnow() - operation.created_at >= timedelta(seconds=15 * 60)
    if expired:
        await applications.set_status(application.id, ApplicationStatus.failed)
        return jobs.fail("Application startup timed out")

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
        bucket = names.application_bucket(organization.slug, application.slug)
        await adapter.revoke(bucket)
        await adapter.delete(bucket)

    return jobs.complete()
