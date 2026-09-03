import secrets
from uuid import UUID
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import update
from src.logger import logger
from sqlalchemy.engine import CursorResult
from src.models.statuses import Status
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale
from src.database.models.solutions import Solution


async def create(solution_id: UUID) -> None:
    """Converge one Solution lifecycle target or running workload."""

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    async with session_scope() as session:
        target = await organizations.solution_infrastructure(session, solution_id)
        if target is None:
            logger.info("Solution %s no longer exists; skipping reconciliation", solution_id)
            return
        solution, infrastructure = target
    if solution.deleted_at is not None:
        logger.info("Solution %s is pending deletion; skipping reconciliation", solution.id)
        return
    organization = infrastructure.organization
    runtime_secrets = solution.secrets

    # Converge providers and the workload while the Solution is not yet published.
    # Reuse generated credentials after an interrupted creation attempt.
    if "LONGLINK_ENV" not in runtime_secrets:
        # Build providers from the Solution's immutable infrastructure assignments.
        object_storage = Exoscale(
            infrastructure.storage.endpoint_url,
            infrastructure.storage.access_key_id,
            infrastructure.storage.secret_access_key,
        )

        # Generate fresh credentials for the initial creation attempt.
        bucket = organization.id.hex
        prefix = f"solutions/{solution.id.hex}/"
        logger.info("Creating object storage credentials for Solution %s", solution.id)
        credentials = await object_storage.solution_credentials(solution.id.hex, bucket, prefix)

        # Revoke freshly-issued storage credentials if database provisioning cannot complete.
        database_password = secrets.token_urlsafe(24)
        try:
            logger.info("Creating PostgreSQL schema for Solution %s", solution.id)
            database = Postgres(
                infrastructure.database.host,
                infrastructure.database.port,
                infrastructure.database.username,
                infrastructure.database.password,
                infrastructure.database.sslmode,
            )
            database_username = await database.solution_schema(organization.id, solution.id, database_password)
        except Exception:
            try:
                await object_storage.revoke_solution(solution.id.hex)
            except Exception:
                logger.exception("Could not revoke storage credentials for Solution '%s'", solution.id)
            raise

        # Build and commit the complete runtime contract before creating the workload.
        runtime_secrets = {
            **runtime_secrets,
            "LONGLINK_ENV": "production",
            "LONGLINK_DATABASE_HOST": infrastructure.database.host,
            "LONGLINK_DATABASE_NAME": organization.id.hex,
            "LONGLINK_DATABASE_PASSWORD": database_password,
            "LONGLINK_DATABASE_PORT": str(infrastructure.database.port),
            "LONGLINK_DATABASE_SCHEMA": solution.id.hex,
            "LONGLINK_DATABASE_SSLMODE": infrastructure.database.sslmode.value,
            "LONGLINK_DATABASE_USERNAME": database_username,
            "LONGLINK_STORAGE_BUCKET": bucket,
            "LONGLINK_STORAGE_ENDPOINT_URL": infrastructure.storage.endpoint_url,
            "LONGLINK_STORAGE_PASSWORD": credentials["secret_access_key"],
            "LONGLINK_STORAGE_PREFIX": prefix,
            "LONGLINK_STORAGE_REGION": object_storage.region,
            "LONGLINK_STORAGE_USERNAME": credentials["access_key_id"],
        }

    # Issue a solution-specific key so only Platform-originated requests can assert an audit identity.
    if "LONGLINK_IDENTITY_SECRET" not in runtime_secrets:
        logger.info("Persisting runtime credentials for Solution %s", solution.id)
        runtime_secrets["LONGLINK_IDENTITY_SECRET"] = secrets.token_urlsafe(32)
        async with session_scope() as session:
            # Persist credentials only while the Solution remains active.
            result = await session.execute(
                update(Solution)
                .where(
                    col(Solution.id) == solution.id,
                    col(Solution.deleted_at).is_(None),
                )
                .values(secrets=runtime_secrets)
            )
            if not isinstance(result, CursorResult):
                raise TypeError("Expected a cursor result")
            if result.rowcount != 1:
                return

            await session.commit()

    # Apply the captured desired release so reconciliation repairs workload drift.
    logger.info("Applying Kubernetes workload for Solution %s", solution.id)
    cluster = Kubernetes(
        infrastructure.compute.kubeconfig,
    )
    try:
        await cluster.solutions.apply(solution.id, organization.id.hex, solution.image_desired, runtime_secrets)
    finally:
        await cluster.aclose()

    # Publish the applied release only after workload readiness.
    if solution.status in {Status.creating, Status.failed}:
        logger.info("Publishing Solution %s", solution.id)
        async with session_scope() as session:
            await session.execute(
                update(Solution)
                .where(
                    col(Solution.id) == solution.id,
                    col(Solution.deleted_at).is_(None),
                    col(Solution.status).in_((Status.creating, Status.failed)),
                )
                .values(status=Status.running)
            )
            await session.commit()


async def delete(solution_id: UUID) -> None:
    """Remove one Solution route, runtime, provider state, and tombstone."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        target = await organizations.solution_infrastructure(session, solution_id)
        if target is None:
            logger.info("Solution %s no longer exists; skipping deletion", solution_id)
            return
        solution, infrastructure = target
    organization = infrastructure.organization

    # Remove Solution Kubernetes resources before revoking provider credentials.
    logger.info("Deleting Kubernetes workload for Solution %s", solution.id)
    cluster = Kubernetes(infrastructure.compute.kubeconfig)
    try:
        await cluster.solutions.delete(solution.id, organization.id.hex)
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
    logger.info("Deleting PostgreSQL schema for Solution %s", solution.id)
    await db.delete_solution_schema(organization.id, solution.id)
    logger.info("Revoking object storage credentials for Solution %s", solution.id)
    await object_storage.revoke_solution(solution.id.hex)
    logger.info("Deleting object storage objects for Solution %s", solution.id)
    await object_storage.delete_prefix(organization.id.hex, f"solutions/{solution.id.hex}/")

    # Purge the tombstone only after all external resources are absent.
    logger.info("Purging Solution %s", solution.id)
    async with session_scope() as session:
        # The delete statement locks the tombstone while making completed cleanup idempotent.
        await session.execute(sql_delete(Solution).where(col(Solution.id) == solution.id))
        await session.commit()
