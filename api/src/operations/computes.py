from src import adapters, projections
from uuid import UUID
from typing import cast
from src.utils import jobs, names, images
from src.version import platform_version_key
from collections.abc import Callable, Awaitable
from src.environments import env
from src.models.types import Image
from src.models.statuses import ApplicationStatus, OrganizationStatus
from src.database.services import compute, operations, applications, organizations
from src.kubernetes.client import Kubernetes
from src.models.operations import ReconciliationScope
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredCompute, ReconcileResult, DesiredApplication, DesiredGatewayRoute, DesiredOrganization
from src.adapters.storage.base import Storage
from src.models.infrastructure import exoscale_zone
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization

Fence = Callable[[], Awaitable[None]]
StageTLS = Callable[[GatewayTLSMaterial], Awaitable[None]]


async def reconcile_platform(
    compute_registry: ComputeRegistry,
    organization_rows: list[Organization],
    application_rows: list[Application],
    cluster: Kubernetes,
    existing_tls: GatewayTLSMaterial | None,
    fence: Fence,
    stage_tls: StageTLS,
) -> ReconcileResult:
    """Reconcile Platform resources while preserving the complete active gateway route set."""

    # Platform routes use persisted, resolved Applications without provisioning their runtime resources.
    active_organizations = {item.id: item for item in organization_rows if item.deleted_at is None}
    routes = tuple(
        DesiredGatewayRoute(id=application.id, namespace=active_organizations[application.organization_id].slug)
        for application in sorted(application_rows, key=lambda item: (item.organization_id, item.slug))
        if application.deleted_at is None
        and application.digest is not None
        and application.organization_id in active_organizations
    )
    desired = DesiredCompute(
        id=compute_registry.id,
        routes=routes,
        organizations=(),
        applications=(),
        deleting=compute_registry.deleted_at is not None,
        scope=ReconciliationScope.platform,
    )
    return await cluster.reconcile(desired, compute_registry.proxy_secret, existing_tls, fence, stage_tls)


async def reconcile_applications(
    operation: Operation,
    compute_registry: ComputeRegistry,
    organization_rows: list[Organization],
    application_rows: list[Application],
    application_ids: set[UUID] | None,
    cluster: Kubernetes,
    existing_tls: GatewayTLSMaterial | None,
    fence: Fence,
    stage_tls: StageTLS,
) -> tuple[ReconcileResult, list[UUID]]:
    """Reconcile complete or explicitly targeted Application state and its Platform dependencies."""

    # Complete work owns the full tenant graph; targeted work selects only requested rows and parent providers.
    complete = application_ids is None
    organizations_by_id = {item.id: item for item in organization_rows}
    active_organizations = {item.id: item for item in organization_rows if item.deleted_at is None}
    selected_applications = [
        item for item in application_rows if complete or (application_ids is not None and item.id in application_ids)
    ]
    selected_organization_ids = {item.organization_id for item in selected_applications}
    provider_organizations = (
        organization_rows if complete else [item for item in organization_rows if item.id in selected_organization_ids]
    )

    # Resolve provider adapters only for Organizations included by this Application operation.
    databases: dict[UUID, adapters.Postgres] = {}
    object_storages: dict[UUID, Storage] = {}
    for organization in provider_organizations:
        database_registry = organization.database
        storage_registry = organization.storage
        databases[organization.id] = adapters.Postgres(
            database_registry.host,
            database_registry.port,
            database_registry.username,
            database_registry.password,
            database_registry.sslmode,
        )
        object_storages[organization.id] = adapters.storage(storage_registry)

    # Complete reconciliation prepares shared Organization resources before any Application resources depend on them.
    if complete:
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
            bucket = names.organization_bucket(organization.id)
            await object_storage.create(bucket)
            await fence()
            await object_storage.create_prefix(bucket, names.shared_storage_prefix())

    # Provision only active Applications selected by this operation.
    desired_applications: list[DesiredApplication] = []
    for application in sorted(
        (item for item in selected_applications if item.deleted_at is None),
        key=lambda item: (item.organization_id, item.slug),
    ):
        organization = active_organizations.get(application.organization_id)
        if organization is None:
            continue
        db = databases[organization.id]
        object_storage = object_storages[organization.id]
        storage_registry = organization.storage

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
        await fence()
        await object_storage.create_prefix(bucket, prefix)
        credentials = applications.storage_credentials(application)
        if credentials is None:
            await fence()
            provisioned = await applications.provision_storage_credentials(
                application.id,
                operation.id,
                operation.attempt_count,
                operation.platform_version,
                lambda: object_storage.credentials(application.id.hex, bucket, (shared_prefix,), prefix),
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
            "LONGLINK_STORAGE_REGION": exoscale_zone(storage_registry.runtime_endpoint_url),
            "LONGLINK_STORAGE_SHARED_PREFIX": shared_prefix,
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

    # Targeted snapshots carry selected parent identities for validation without reconciling shared Organization resources.
    desired_organization_ids = (
        set(active_organizations)
        if complete
        else {application.organization_id for application in desired_applications}
    )
    desired_organizations = tuple(
        DesiredOrganization(id=organization.id, slug=organization.slug)
        for organization in sorted(active_organizations.values(), key=lambda item: item.slug)
        if organization.id in desired_organization_ids
    )

    # Gateway routes remain complete while selected failures and deletions are omitted.
    desired_by_id = {application.id: application for application in desired_applications}
    routes: list[DesiredGatewayRoute] = []
    for application in sorted(application_rows, key=lambda item: (item.organization_id, item.slug)):
        organization = active_organizations.get(application.organization_id)
        if organization is None or application.deleted_at is not None:
            continue
        selected = complete or (application_ids is not None and application.id in application_ids)
        if selected:
            desired_application = desired_by_id.get(application.id)
            if desired_application is not None:
                routes.append(DesiredGatewayRoute(id=application.id, namespace=desired_application.namespace))
        elif application.digest is not None:
            routes.append(DesiredGatewayRoute(id=application.id, namespace=organization.slug))

    desired = DesiredCompute(
        id=compute_registry.id,
        routes=tuple(routes),
        organizations=desired_organizations,
        applications=tuple(desired_applications),
        application_ids=tuple(sorted(application_ids, key=str)) if application_ids is not None else None,
        deleting=compute_registry.deleted_at is not None,
        scope=ReconciliationScope.application,
    )
    result = await cluster.reconcile(desired, compute_registry.proxy_secret, existing_tls, fence, stage_tls)

    # Observe only workloads applied by this operation.
    pending_applications: list[UUID] = []
    for application in desired_applications:
        await fence()
        if await cluster.applications.ready(str(application.id)):
            await applications.set_status(application.id, ApplicationStatus.running)
        else:
            pending_applications.append(application.id)
    if complete:
        for organization in active_organizations.values():
            await fence()
            await organizations.set_runtime(organization.id, OrganizationStatus.running)

    # Kubernetes pruning precedes provider cleanup for only the selected tombstones.
    for application in selected_applications:
        if application.deleted_at is None:
            continue
        organization = organizations_by_id.get(application.organization_id)
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

    # Organization deletion remains a complete reconciliation responsibility.
    if complete:
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
    return result, pending_applications


async def reconcile(operation: Operation) -> jobs.OperationOutcome:
    """Dispatch one leased compute Operation to Platform or Application orchestration."""

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

    # Load the compute reconciliation root and complete route inventory.
    compute_registry = await compute.get(operation.compute_id, include_deleted=True)
    if compute_registry is None:
        return jobs.fail("Compute registry not found")
    if operation.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")
    if compute_registry.version is not None and platform_version_key(compute_registry.version) > platform_version_key(
        operation.platform_version
    ):
        return jobs.retry("Compute target was already reconciled by a newer Platform release")
    organization_rows = await organizations.for_compute(compute_registry.id)
    application_rows = await applications.for_compute(compute_registry.id)

    # Reuse persisted TLS identity across either orchestration path.
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
    cluster = Kubernetes(compute_registry.kubeconfig)

    try:
        # Dispatch without allowing Platform work to enter Application provider orchestration.
        pending_applications: list[UUID] = []
        if operation.scope == ReconciliationScope.platform:
            result = await reconcile_platform(
                compute_registry,
                organization_rows,
                application_rows,
                cluster,
                existing_tls,
                fence,
                stage_tls,
            )
        else:
            application_ids = (
                {UUID(application_id) for application_id in operation.application_ids}
                if operation.application_ids is not None
                else None
            )
            result, pending_applications = await reconcile_applications(
                operation,
                compute_registry,
                organization_rows,
                application_rows,
                application_ids,
                cluster,
                existing_tls,
                fence,
                stage_tls,
            )

        # Pending workloads retry until the bounded attempt budget is exhausted.
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

        # Persist the release only after the requested orchestration completes successfully.
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
        # Record the failed state while the worker logs detailed diagnostics.
        await fence()
        await compute.record_failure(
            compute_registry.id,
            operation.id,
            attempt_count,
            operation.platform_version,
        )
        raise
