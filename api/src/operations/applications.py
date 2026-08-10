import secrets
from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import applications, organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.operations import Operation


async def create(claimed: Operation) -> str | None:
    """Converge one Application lifecycle target or running workload."""

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    async with session_scope() as session:
        application = await applications.get(session, claimed.target_id, include_deleted=True)
        if application is None or application.deleted_at is not None:
            return None
        infrastructure = await organizations.infrastructure(session, application.organization_id)
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        return "Application Organization not found"
    organization = infrastructure.organization

    cluster = Kubernetes(infrastructure.compute.kubeconfig)

    # Converge providers and the workload while the Application is not yet published.
    if application.status != Status.running:
        # Reuse generated credentials after an interrupted creation attempt.
        if not any(name.startswith("LONGLINK_") for name in application.secrets):
            # Resolve the Application's immutable provider assignments.
            db = Postgres(
                infrastructure.database.host,
                infrastructure.database.port,
                infrastructure.database.username,
                infrastructure.database.password,
                infrastructure.database.sslmode,
            )
            object_storage = Exoscale(
                infrastructure.storage.endpoint_url,
                infrastructure.storage.access_key_id,
                infrastructure.storage.secret_access_key,
            )

            # Generate fresh credentials for the initial creation attempt.
            bucket = organization.id.hex
            prefix = f"applications/{application.id.hex}/"
            database_password = secrets.token_urlsafe(24)
            credentials = await object_storage.credentials(claimed.target_id.hex, bucket, prefix)

            connection = await db.schema(organization.id, application.id, database_password)

            # Build and commit the complete runtime contract before creating the workload.
            runtime_secrets = {
                "LONGLINK_ENV": "production",
                "LONGLINK_DATABASE_HOST": connection["host"],
                "LONGLINK_DATABASE_NAME": connection["database_name"],
                "LONGLINK_DATABASE_PASSWORD": connection["password"],
                "LONGLINK_DATABASE_PORT": str(connection["port"]),
                "LONGLINK_DATABASE_SCHEMA": application.id.hex,
                "LONGLINK_DATABASE_SSLMODE": connection["sslmode"].value,
                "LONGLINK_DATABASE_USERNAME": connection["username"],
                "LONGLINK_STORAGE_BUCKET": bucket,
                "LONGLINK_STORAGE_ENDPOINT_URL": infrastructure.storage.endpoint_url,
                "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
                "LONGLINK_STORAGE_PREFIX": prefix,
                "LONGLINK_STORAGE_REGION": object_storage.region,
                "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
            }
            async with session_scope() as session:
                persisted_secrets = await applications.add_runtime_secrets(session, application.id, runtime_secrets)
                await session.commit()
            if persisted_secrets is None:
                return None
            application.secrets = persisted_secrets

    # Reapply the workload so creation retries and release reconciliation repair deployment drift.
    await cluster.applications.apply(application.id, organization.id.hex, application.image, application.secrets)

    # Publish running after workload readiness.
    async with session_scope() as session:
        await applications.mark_running(session, application.id)
        await session.commit()


async def delete(claimed: Operation) -> str | None:
    """Remove one Application route, runtime, provider state, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        application = await applications.get(session, claimed.target_id, include_deleted=True)
        if application is None:
            return None
        if application.deleted_at is None:
            return "Active Applications cannot be deleted by lifecycle cleanup"
        infrastructure = await organizations.infrastructure(session, application.organization_id)
    if infrastructure is None:
        return "Application Organization not found"
    organization = infrastructure.organization
    registry = infrastructure.compute
    database_registry = infrastructure.database
    storage_registry = infrastructure.storage
    cluster = Kubernetes(registry.kubeconfig)

    # Remove Application Kubernetes resources before revoking provider credentials.
    await cluster.applications.delete(application.id, organization.id.hex)

    # Provider credentials remain available until Kubernetes confirms no Pod can use them.
    db = Postgres(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
    )
    object_storage = Exoscale(
        storage_registry.endpoint_url,
        storage_registry.access_key_id,
        storage_registry.secret_access_key,
    )
    await db.delete_schema(organization.id, application.id)
    await object_storage.revoke(application.id.hex)
    await object_storage.delete_prefix(organization.id.hex, f"applications/{application.id.hex}/")
    async with session_scope() as session:
        await applications.purge(session, application.id)
        await session.commit()
