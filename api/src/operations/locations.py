import asyncio
from src import adapters, projections
from typing import cast
from src.utils import jobs, names, images
from src.logger import logger
from src.version import platform_version_key
from src.environments import env
from src.models.statuses import ApplicationStatus, OrganizationStatus
from src.database.services import compute, storage, database, locations, operations, applications, organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredLocation, DesiredApplication, DesiredOrganization
from src.database.models.operations import Operation


async def run_periodic_reconciliation() -> None:
    """Periodically request drift repair for every active or incompletely deleted Location. Each API replica may scan because Location queueing coalesces duplicate requests."""

    # Every API replica may scan because the open-operation index coalesces duplicate requests.
    while True:
        try:
            for location in await locations.fetch(include_deleted=True):
                if location.deleted_at is not None and location.version is not None:
                    continue
                await operations.enqueue(location.id, desired_change=False)
        except Exception as exc:
            logger.exception("Periodic location reconciliation scan failed: %r", exc)
        await asyncio.sleep(env.RECONCILE_INTERVAL_SECONDS)


async def reconcile(operation: Operation) -> jobs.OperationOutcome:
    """Converge one Location's desired Organization and LongLink Application state across its database, storage, and Kubernetes backends. The claimed attempt fences provider writes, while tombstones drive cleanup before observed state advances. Release mismatches and incomplete readiness request retry."""

    # Every external mutation is fenced by the unexpired lease claimed for this attempt.
    attempt_count = operation.attempt_count
    if attempt_count < 1 or operation.lease_expires_at is None:
        raise ValueError("Location reconciliation requires a claimed operation")

    async def fence() -> None:
        """Reject provider work after another worker can own this operation."""

        if not await operations.lease_is_current(operation.id, attempt_count):
            raise jobs.OperationLeaseLost(operation.id)

    async def stage_tls(material: GatewayTLSMaterial) -> None:
        """Stage gateway trust before Kubernetes can begin serving a rotated certificate."""

        await fence()
        staged = await compute.stage_gateway_tls(
            operation.location_id,
            material.ca_certificate,
            material.certificate,
            material.private_key,
            operation.id,
            attempt_count,
            operation.platform_version,
        )
        if not staged:
            raise jobs.OperationLeaseLost(operation.id)

    # Load the immutable infrastructure triple and complete tenant snapshot.
    location = await locations.get(operation.location_id, include_deleted=True)
    compute_registry = await compute.location(operation.location_id, include_deleted=True)
    database_registry = await database.location(operation.location_id, include_deleted=True)
    storage_registry = await storage.location(operation.location_id, include_deleted=True)
    if location is None or compute_registry is None or database_registry is None or storage_registry is None:
        if location is not None:
            await locations.record_failure(
                location.id,
                operation.id,
                attempt_count,
                operation.platform_version,
            )
        return jobs.fail("Location infrastructure is incomplete")
    if operation.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")
    if location.version is not None and platform_version_key(location.version) > platform_version_key(operation.platform_version):
        return jobs.retry("Location was already reconciled by a newer Platform release")
    organization_rows = await organizations.location(location.id, include_deleted=True)
    application_rows = await applications.location(location.id, include_deleted=True)

    try:
        # Prepare active organization and application provider resources before rendering Kubernetes state.
        db = adapters.database(database_registry)
        object_storage = adapters.storage(storage_registry)
        desired_organizations: list[DesiredOrganization] = []
        desired_applications: list[DesiredApplication] = []
        active_organizations = {item.id: item for item in organization_rows if item.deleted_at is None}

        for organization in sorted(active_organizations.values(), key=lambda item: item.slug):
            await fence()
            await db.prepare_organization_database(organization.id, organization.shared_schema_url)
            if organization.status != OrganizationStatus.running:
                await fence()
                await organizations.set_runtime(organization.id, OrganizationStatus.creating)
            await fence()
            await projections.sync_organization_users(organization)
            await fence()
            await object_storage.create(names.organization_shared_bucket(organization.id))
            desired_organizations.append(DesiredOrganization(id=organization.id, slug=organization.slug))

        pending_applications = []
        for application in sorted(
            (item for item in application_rows if item.deleted_at is None),
            key=lambda item: (item.organization_id, item.slug),
        ):
            organization = active_organizations.get(application.organization_id)
            if organization is None:
                continue

            # Resolve and persist the immutable image before creating provider credentials.
            if application.digest is None:
                metadata = await images.metadata(application.image, application.envs)
                if metadata is None:
                    await applications.set_status(application.id, ApplicationStatus.failed)
                    continue
                updated = await applications.update_runtime(
                    application.id,
                    image=cast(str, metadata.image),
                    sdk=metadata.sdk,
                    digest=metadata.digest,
                    version=metadata.version,
                    description=application.description,
                    icon=application.icon,
                    envs=application.envs,
                    user=None,
                )
                if updated is None:
                    continue
                application = updated

            # Ensure stable database and storage credentials before constructing the exact runtime Secret.
            await fence()
            connection = await db.schema(organization.id, application.id, application.database_password)
            bucket = names.application_bucket(application.id)
            await fence()
            await object_storage.create(bucket)
            credentials = applications.storage_credentials(application)
            if credentials is None:
                await fence()
                credentials = await object_storage.credentials(bucket, "write")
                try:
                    persisted = await applications.set_storage_credentials(application.id, credentials)
                except Exception:
                    await object_storage.revoke(bucket)
                    raise
                if persisted is None:
                    await object_storage.revoke(bucket)
                    raise RuntimeError("Application disappeared while persisting storage credentials")
                application = persisted

            envs = {
                **application.envs,
                "LONGLINK_ENV": "production",
                "LONGLINK_DATABASE_HOST": connection["host"],
                "LONGLINK_DATABASE_NAME": connection["database_name"],
                "LONGLINK_DATABASE_PASSWORD": connection["password"],
                "LONGLINK_DATABASE_PORT": str(connection["port"]),
                "LONGLINK_DATABASE_SCHEMA": application.id.hex,
                "LONGLINK_DATABASE_SSLMODE": connection["sslmode"],
                "LONGLINK_DATABASE_USERNAME": connection["username"],
                "LONGLINK_STORAGE_BUCKET": bucket,
                "LONGLINK_STORAGE_ENDPOINT_URL": storage_registry.runtime_endpoint_url,
                "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
                "LONGLINK_STORAGE_SHARED_BUCKET": names.organization_shared_bucket(organization.id),
                "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
            }
            desired_applications.append(
                DesiredApplication(
                    id=application.id,
                    organization_id=organization.id,
                    namespace=organization.slug,
                    image=application.image,
                    envs=envs,
                )
            )

        # Reuse persisted TLS identity so ordinary reconciliation remains idempotent.
        existing_tls = None
        if (
            compute_registry.gateway_ca_certificate is not None
            and compute_registry.gateway_tls_certificate is not None
            and compute_registry.gateway_tls_private_key is not None
        ):
            existing_tls = GatewayTLSMaterial(
                ca_certificate=compute_registry.gateway_ca_certificate,
                certificate=compute_registry.gateway_tls_certificate,
                private_key=compute_registry.gateway_tls_private_key,
            )
        desired = DesiredLocation(
            id=location.id,
            organizations=tuple(desired_organizations),
            applications=tuple(desired_applications),
            deleting=location.deleted_at is not None,
        )
        cluster = Kubernetes(compute_registry.kubeconfig)
        result = await cluster.reconcile(desired, compute_registry.proxy_secret, existing_tls, fence, stage_tls)

        # Workload readiness is observed after the gateway has accepted the exact desired route set.
        for application in desired_applications:
            await fence()
            if await cluster.applications.ready(str(application.id)):
                await applications.set_status(application.id, ApplicationStatus.running)
            else:
                pending_applications.append(application.id)
        for organization in active_organizations.values():
            await fence()
            await organizations.set_runtime(organization.id, OrganizationStatus.running)

        # Kubernetes pruning precedes irreversible provider cleanup for tombstoned resources.
        for application in application_rows:
            if application.deleted_at is None:
                continue
            organization = next((item for item in organization_rows if item.id == application.organization_id), None)
            if organization is not None:
                await fence()
                await db.delete_schema(organization.id, application.id)
            bucket = names.application_bucket(application.id)
            await fence()
            await object_storage.revoke(bucket)
            await fence()
            await object_storage.delete(bucket)
            await fence()
            await applications.purge(application.id)
        for organization in organization_rows:
            if organization.deleted_at is None:
                continue
            await fence()
            await db.delete_database(organization.id)
            await fence()
            await object_storage.delete(names.organization_shared_bucket(organization.id))
            await fence()
            await organizations.purge(organization.id)

        if pending_applications:
            if attempt_count >= jobs.OPERATION_ATTEMPT_LIMIT:
                for application_id in pending_applications:
                    await applications.set_status(application_id, ApplicationStatus.failed)
                await locations.record_failure(
                    location.id,
                    operation.id,
                    attempt_count,
                    operation.platform_version,
                )
                return jobs.fail("Application workloads did not become ready")
            return jobs.retry("Application workloads are still starting")

        # Persist the release only after workloads, pruning, and destructive cleanup all succeed.
        await fence()
        applied = await locations.record_success(
            location.id,
            operation.platform_version,
            result.gateway_url,
            result.gateway_ca_certificate,
            result.gateway_tls_certificate,
            result.gateway_tls_private_key,
            operation.id,
            attempt_count,
        )
        if not applied:
            return jobs.retry("Location reconciliation was superseded")
        return jobs.complete()
    except jobs.OperationLeaseLost:
        raise
    except Exception:
        # The location status is a summary; detailed diagnostics remain on the operation.
        await fence()
        await locations.record_failure(
            location.id,
            operation.id,
            attempt_count,
            operation.platform_version,
        )
        raise
