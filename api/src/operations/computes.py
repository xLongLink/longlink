import asyncio
from src import adapters, projections
from uuid import UUID
from typing import cast
from src.utils import jobs, names, images
from src.logger import logger
from src.version import platform_version_key
from src.environments import env
from src.models.types import Image, StorageKind
from src.models.statuses import ApplicationStatus, OrganizationStatus
from src.adapters.database import Postgres
from src.database.services import compute, storage, database, operations, applications, organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredCompute, DesiredApplication, DesiredOrganization
from src.adapters.storage.base import Storage
from src.models.infrastructure import exoscale_zone
from src.database.models.storages import StorageRegistry
from src.database.models.operations import Operation


async def run_periodic_reconciliation() -> None:
    """Periodically request drift repair for every active or incompletely deleted compute target."""

    # Every API replica may scan because the open-operation index coalesces duplicate requests.
    while True:
        try:
            for registry in await compute.fetch(include_deleted=True):
                if registry.deleted_at is not None and registry.version is not None:
                    continue
                await operations.enqueue(registry.id, desired_change=False)
        except Exception as exc:
            logger.exception("Periodic compute reconciliation scan failed: %r", exc)
        await asyncio.sleep(env.RECONCILE_INTERVAL_SECONDS)


async def reconcile(operation: Operation) -> jobs.OperationOutcome:
    """Converge all Organization and Application state assigned to one compute target."""

    # Every external mutation is fenced by the unexpired lease claimed for this attempt.
    attempt_count = operation.attempt_count
    if attempt_count < 1 or operation.lease_expires_at is None:
        raise ValueError("Compute reconciliation requires a claimed operation")

    async def fence() -> None:
        """Reject provider work after another worker can own this operation."""

        if not await operations.lease_is_current(operation.id, attempt_count):
            raise jobs.OperationLeaseLost(operation.id)

    async def stage_tls(material: GatewayTLSMaterial) -> None:
        """Stage gateway trust before Kubernetes can begin serving a rotated certificate."""

        await fence()
        staged = await compute.stage_gateway_tls(
            operation.compute_id,
            material.ca_certificate,
            material.certificate,
            material.private_key,
            operation.id,
            attempt_count,
            operation.platform_version,
        )
        if not staged:
            raise jobs.OperationLeaseLost(operation.id)

    # Load the compute reconciliation root and complete tenant snapshot.
    compute_registry = await compute.get(operation.compute_id, include_deleted=True)
    if compute_registry is None:
        return jobs.fail("Compute registry not found")
    if operation.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")
    if compute_registry.version is not None and platform_version_key(compute_registry.version) > platform_version_key(
        operation.platform_version
    ):
        return jobs.retry("Compute target was already reconciled by a newer Platform release")
    organization_rows = await organizations.for_compute(compute_registry.id, include_deleted=True)
    application_rows = await applications.for_compute(compute_registry.id, include_deleted=True)

    try:
        # Resolve each Organization's immutable database and storage assignments before provider writes.
        databases: dict[UUID, Postgres] = {}
        object_storages: dict[UUID, Storage] = {}
        storage_registries: dict[UUID, StorageRegistry] = {}
        for organization in organization_rows:
            database_registry = await database.get(organization.database_id, include_deleted=True)
            storage_registry = await storage.get(organization.storage_id, include_deleted=True)
            if database_registry is None or storage_registry is None:
                await compute.record_failure(
                    compute_registry.id,
                    operation.id,
                    attempt_count,
                    operation.platform_version,
                )
                return jobs.fail(f"Organization '{organization.slug}' infrastructure is incomplete")
            databases[organization.id] = adapters.database(database_registry)
            object_storages[organization.id] = adapters.storage(storage_registry)
            storage_registries[organization.id] = storage_registry

        # Prepare active Organization and Application provider resources before rendering Kubernetes state.
        desired_organizations: list[DesiredOrganization] = []
        desired_applications: list[DesiredApplication] = []
        active_organizations = {item.id: item for item in organization_rows if item.deleted_at is None}

        for organization in sorted(active_organizations.values(), key=lambda item: item.slug):
            db = databases[organization.id]
            object_storage = object_storages[organization.id]
            await fence()
            await db.prepare_organization_database(organization.id, organization.shared_schema_url)
            if organization.status != OrganizationStatus.running:
                await fence()
                await organizations.set_runtime(organization.id, OrganizationStatus.creating)
            await fence()
            await projections.sync_organization_users(organization)
            await fence()
            await object_storage.create(names.organization_bucket(organization.id))
            desired_organizations.append(DesiredOrganization(id=organization.id, slug=organization.slug))

        pending_applications = []
        for application in sorted(
            (item for item in application_rows if item.deleted_at is None),
            key=lambda item: (item.organization_id, item.slug),
        ):
            organization = active_organizations.get(application.organization_id)
            if organization is None:
                continue
            db = databases[organization.id]
            object_storage = object_storages[organization.id]
            storage_registry = storage_registries[organization.id]

            # Resolve and persist the immutable image before creating provider credentials.
            if application.digest is None:
                metadata = await images.metadata(Image(application.image), application.envs)
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
            bucket = names.organization_bucket(organization.id)
            prefix = names.application_storage_prefix(application.id)
            shared_prefix = names.shared_storage_prefix()
            credentials = applications.storage_credentials(application)
            if credentials is None:
                await fence()
                provisioned = await applications.provision_storage_credentials(
                    application.id,
                    operation.id,
                    attempt_count,
                    operation.platform_version,
                    lambda: object_storage.credentials(
                        application.id.hex,
                        bucket,
                        (shared_prefix,),
                        prefix,
                    ),
                    lambda generated: object_storage.discard(generated["access_key_id"]),
                )
                if provisioned is None:
                    raise jobs.OperationLeaseLost(operation.id)
                application, credentials = provisioned

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
                "LONGLINK_STORAGE_PREFIX": prefix,
                "LONGLINK_STORAGE_SHARED_PREFIX": shared_prefix,
                "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
            }
            if storage_registry.kind == StorageKind.exoscale:
                envs["LONGLINK_STORAGE_REGION"] = exoscale_zone(storage_registry.runtime_endpoint_url)
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
        desired = DesiredCompute(
            id=compute_registry.id,
            organizations=tuple(desired_organizations),
            applications=tuple(desired_applications),
            deleting=compute_registry.deleted_at is not None,
        )
        cluster = Kubernetes(compute_registry.kubeconfig)
        result = await cluster.reconcile(desired, compute_registry.proxy_secret, existing_tls, fence, stage_tls)

        # Workload readiness is observed only after the gateway accepts the exact desired route set.
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
                db = databases[organization.id]
                object_storage = object_storages[organization.id]
                await fence()
                await db.delete_schema(organization.id, application.id)
                bucket = names.organization_bucket(organization.id)
                await fence()
                await object_storage.revoke(application.id.hex)
                await fence()
                await object_storage.delete_prefix(bucket, names.application_storage_prefix(application.id))
            await fence()
            await applications.purge(application.id)
        for organization in organization_rows:
            if organization.deleted_at is None:
                continue
            db = databases[organization.id]
            object_storage = object_storages[organization.id]
            await fence()
            await db.delete_database(organization.id)
            await fence()
            await object_storage.delete(names.organization_bucket(organization.id))
            await fence()
            await organizations.purge(organization.id)

        if pending_applications:
            if attempt_count >= jobs.OPERATION_ATTEMPT_LIMIT:
                for application_id in pending_applications:
                    await applications.set_status(application_id, ApplicationStatus.failed)
                await compute.record_failure(
                    compute_registry.id,
                    operation.id,
                    attempt_count,
                    operation.platform_version,
                )
                return jobs.fail("Application workloads did not become ready")
            return jobs.retry("Application workloads are still starting")

        # Persist the release only after workloads, pruning, and destructive cleanup all succeed.
        await fence()
        applied = await compute.record_success(
            compute_registry.id,
            operation.platform_version,
            result.gateway_url,
            result.gateway_ca_certificate,
            result.gateway_tls_certificate,
            result.gateway_tls_private_key,
            operation.id,
            attempt_count,
        )
        if not applied:
            return jobs.retry("Compute reconciliation was superseded")
        return jobs.complete()
    except jobs.OperationLeaseLost:
        raise
    except Exception:
        # Compute status is a summary; detailed diagnostics remain on the Operation.
        await fence()
        await compute.record_failure(
            compute_registry.id,
            operation.id,
            attempt_count,
            operation.platform_version,
        )
        raise
