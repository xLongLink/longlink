import secrets
from uuid import UUID
from sqlalchemy import delete as sql_delete
from sqlalchemy import update
from src.logger import logger
from src.environments import env
from src.models.types import DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.applications import Application


async def create(application_id: UUID) -> None:
    """Converge one Application lifecycle target or running workload."""

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    async with session_scope() as session:
        target = await organizations.application_infrastructure(session, application_id)
        if target is None:
            logger.info("Application %s no longer exists; skipping reconciliation", application_id)
            return
        application, infrastructure = target
    if application.deleted_at is not None:
        logger.info("Application %s is pending deletion; skipping reconciliation", application.id)
        return
    organization = infrastructure.organization
    runtime_secrets = application.secrets

    # Refuse legacy insecure database registrations before provisioning or applying a production workload.
    if not env.DEVELOPMENT and infrastructure.database.sslmode != DatabaseSSLMode.verify_full:
        raise RuntimeError("Production databases must use sslmode=verify-full")

    # Converge providers and the workload while the Application is not yet published.
    # Reuse generated credentials after an interrupted creation attempt.
    if "LONGLINK_ENV" not in runtime_secrets:
        # Build providers from the Application's immutable infrastructure assignments.
        object_storage = Exoscale(
            infrastructure.storage.endpoint_url,
            infrastructure.storage.access_key_id,
            infrastructure.storage.secret_access_key,
        )

        # Generate fresh credentials for the initial creation attempt.
        bucket = organization.id.hex
        prefix = f"applications/{application.id.hex}/"
        logger.info("Creating object storage credentials for Application %s", application.id)
        credentials = await object_storage.credentials(application.id.hex, bucket, prefix)

        # Revoke freshly-issued storage credentials if database provisioning cannot complete.
        try:
            logger.info("Creating PostgreSQL schema for Application %s", application.id)
            connection = await Postgres(
                infrastructure.database.host,
                infrastructure.database.port,
                infrastructure.database.username,
                infrastructure.database.password,
                infrastructure.database.sslmode,
            ).schema(organization.id, application.id, secrets.token_urlsafe(24))
        except Exception:
            try:
                await object_storage.revoke(application.id.hex)
            except Exception:
                logger.exception("Could not revoke storage credentials for Application '%s'", application.id)
            raise

        # Build and commit the complete runtime contract before creating the workload.
        runtime_secrets = {
            **runtime_secrets,
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

    # Issue an application-specific key so only Platform-originated requests can assert an audit identity.
    if "LONGLINK_IDENTITY_SECRET" not in runtime_secrets:
        logger.info("Persisting runtime credentials for Application %s", application.id)
        runtime_secrets["LONGLINK_IDENTITY_SECRET"] = secrets.token_urlsafe(32)
        async with session_scope() as session:
            # Persist credentials only while the Application remains active.
            result = await session.execute(
                update(Application)
                .where(
                    Application.id == application.id,
                    Application.deleted_at.is_(None),
                )
                .values(secrets=runtime_secrets)
            )
            if result.rowcount != 1:
                return

            await session.commit()

    # Apply the captured desired release so reconciliation repairs workload drift.
    logger.info("Applying Kubernetes workload for Application %s", application.id)
    cluster = Kubernetes(
        infrastructure.compute.kubeconfig,
    )
    try:
        await cluster.applications.apply(
            application.id, organization.id.hex, application.image_desired, runtime_secrets
        )
    finally:
        await cluster.aclose()

    # Publish the applied release only after workload readiness.
    if application.status in {Status.creating, Status.failed}:
        logger.info("Publishing Application %s", application.id)
        async with session_scope() as session:
            await session.execute(
                update(Application)
                .where(
                    Application.id == application.id,
                    Application.deleted_at.is_(None),
                    Application.status.in_((Status.creating, Status.failed)),
                )
                .values(status=Status.running)
            )
            await session.commit()


async def delete(application_id: UUID) -> None:
    """Remove one Application route, runtime, provider state, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        target = await organizations.application_infrastructure(session, application_id)
        if target is None:
            logger.info("Application %s no longer exists; skipping deletion", application_id)
            return
        application, infrastructure = target
    organization = infrastructure.organization

    # Remove Application Kubernetes resources before revoking provider credentials.
    logger.info("Deleting Kubernetes workload for Application %s", application.id)
    cluster = Kubernetes(infrastructure.compute.kubeconfig)
    try:
        await cluster.applications.delete(application.id, organization.id.hex)
    finally:
        await cluster.aclose()

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
    logger.info("Deleting PostgreSQL schema for Application %s", application.id)
    await db.delete_schema(organization.id, application.id)
    logger.info("Revoking object storage credentials for Application %s", application.id)
    await object_storage.revoke(application.id.hex)
    logger.info("Deleting object storage objects for Application %s", application.id)
    await object_storage.delete_prefix(organization.id.hex, f"applications/{application.id.hex}/")

    # Purge the tombstone only after all external resources are absent.
    logger.info("Purging Application %s", application.id)
    async with session_scope() as session:
        # The delete statement locks the tombstone while making completed cleanup idempotent.
        await session.execute(sql_delete(Application).where(Application.id == application.id))
        await session.commit()
