import secrets
from sqlalchemy import update
from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import applications, organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.operations import Operation
from src.database.models.applications import Application


async def create(claimed: Operation) -> str | None:
    """Converge one Application lifecycle target or running workload."""

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    async with session_scope() as session:
        target = await organizations.application_infrastructure(session, claimed.target_id)
        if target is None:
            return None
        application, infrastructure = target
    if infrastructure is None or infrastructure.organization.deleted_at is not None:
        return "Application Organization not found"
    organization = infrastructure.organization

    # Converge providers and the workload while the Application is not yet published.
    # Reuse generated credentials after an interrupted creation attempt.
    if "LONGLINK_ENV" not in application.secrets:
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
        credentials = await object_storage.credentials(application.id.hex, bucket, prefix)

        connection = await db.schema(organization.id, application.id, secrets.token_urlsafe(24))

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
            # Lock the Application so only the first creation attempt writes generated credentials.
            persisted_application = await session.get(Application, application.id, with_for_update=True)
            if persisted_application is None or persisted_application.deleted_at is not None:
                return None

            # Reuse durable runtime values after an interrupted creation attempt.
            if "LONGLINK_ENV" not in persisted_application.secrets:
                # Assign a new mapping so SQLAlchemy persists the encrypted JSON value.
                persisted_application.secrets = {**persisted_application.secrets, **runtime_secrets}
            persisted_secrets = persisted_application.secrets
            await session.commit()
        application.secrets = persisted_secrets

    # Apply the captured desired release so reconciliation repairs workload drift.
    await Kubernetes(infrastructure.compute.kubeconfig).applications.apply(
        application.id, organization.id.hex, application.image_desired, application.secrets
    )

    # Publish the applied release only after workload readiness.
    async with session_scope() as session:
        await session.execute(
            update(Application)
            .where(
                Application.id == application.id,
                Application.deleted_at.is_(None),
                Application.status == Status.creating,
            )
            .values(status=Status.running)
        )
        await session.commit()


async def delete(claimed: Operation) -> str | None:
    """Remove one Application route, runtime, provider state, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        target = await organizations.application_infrastructure(session, claimed.target_id, include_deleted=True)
        if target is None:
            return None
        application, infrastructure = target
        if application.deleted_at is None:
            return "Active Applications cannot be deleted by lifecycle cleanup"
    if infrastructure is None:
        return "Application Organization not found"
    organization = infrastructure.organization
    # Remove Application Kubernetes resources before revoking provider credentials.
    await Kubernetes(infrastructure.compute.kubeconfig).applications.delete(application.id, organization.id.hex)

    # Provider credentials remain available until Kubernetes confirms no Pod can use them.
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
    await db.delete_schema(organization.id, application.id)
    await object_storage.revoke(application.id.hex)
    await object_storage.delete_prefix(organization.id.hex, f"applications/{application.id.hex}/")
    async with session_scope() as session:
        await applications.purge(session, application.id)
        await session.commit()
