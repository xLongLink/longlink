import secrets
from uuid import UUID
from datetime import UTC, datetime
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import update
from src.logger import logger
from src.kubernetes import namespace
from src.operations import databases
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.storage import Storage
from src.database.models.solutions import Revision, Solution


async def deploy(revision_id: UUID) -> None:
    """Deploy the desired Solution revision."""

    # Resolve the exact lifecycle target and its immutable infrastructure assignments.
    async with session_scope() as session:
        revision = await session.get(Revision, revision_id)
        if revision is None:
            return
        solution_id = revision.solution_id
        target = await organizations.solution_infrastructure(session, solution_id)
        if target is None:
            logger.info("Solution %s no longer exists; skipping reconciliation", solution_id)
            return
        solution, organization, compute = target
        if revision.id != solution.effective_revision_id:
            return
        if solution.deleted_at is not None:
            return
        await session.execute(update(Solution).where(col(Solution.id) == solution_id).values(status=Status.creating))
        await session.commit()
        runtime_secrets = dict(solution.secrets)

    # Organization reconciliation owns bucket provisioning and quota admission.
    cluster = Kubernetes(
        compute.kubeconfig,
    )
    async with cluster:
        storage = Storage(compute, cluster)
        bucket_name = storage.bucket_name(organization.id)

        # Reuse generated credentials after an interrupted creation attempt.
        if "LONGLINK_ENV" not in runtime_secrets:
            # RustFS service accounts are scoped to this Solution and owner keys never reach workloads.
            logger.info("Creating object storage credentials for Solution %s", solution.id)
            database_password = secrets.token_urlsafe(24)
            credentials = await storage.service_account(organization.id, solution.id)
            database = await databases.connection(organization, cluster)
            database_username = await database.solution_schema(organization.id, solution.id, database_password)

            # Build and commit the complete runtime contract before creating the workload.
            runtime_secrets = {
                **runtime_secrets,
                "LONGLINK_ENV": "production",
                "LONGLINK_DATABASE_HOST": namespace.database_hostname(organization.id),
                "LONGLINK_DATABASE_NAME": organization.id.hex,
                "LONGLINK_DATABASE_PASSWORD": database_password,
                "LONGLINK_DATABASE_PORT": "5432",
                "LONGLINK_DATABASE_SCHEMA": solution.id.hex,
                "LONGLINK_DATABASE_USERNAME": database_username,
                "LONGLINK_STORAGE_BUCKET": bucket_name,
                "LONGLINK_STORAGE_PASSWORD": credentials.secret_key,
                "LONGLINK_STORAGE_PREFIX": f"solutions/{solution.id.hex}/",
                "LONGLINK_STORAGE_REGION": "us-east-1",
                "LONGLINK_STORAGE_USERNAME": credentials.access_key,
            }

        # Issue a solution-specific key so only Platform-originated requests can assert an audit identity.
        if "LONGLINK_IDENTITY_SECRET" not in runtime_secrets:
            logger.info("Persisting runtime credentials for Solution %s", solution.id)
            runtime_secrets["LONGLINK_IDENTITY_SECRET"] = secrets.token_urlsafe(32)

        # Define every LONGLINK_* variable next to the persisted runtime contract.
        runtime_secrets = {
            **runtime_secrets,
            # Workloads always reach object storage through the cluster-local TLS proxy.
            "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
            # Fetch the current CA once for workload rendering on every path.
            "LONGLINK_DATABASE_CERTIFICATE": await cluster.databases.certificate(organization.id),
            **({"LONGLINK_STORAGE_CERTIFICATE": compute.storage_certificate} if compute.storage_certificate else {}),
        }

        # Persist generated credentials when the runtime contract changed.
        if runtime_secrets != solution.secrets:
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
                if result.rowcount != 1:
                    return

                await session.commit()

        # Apply the captured desired release so reconciliation repairs workload drift.
        logger.info("Applying Kubernetes workload for Solution %s", solution.id)
        await cluster.solutions.apply(
            organization.id,
            solution.id,
            revision.image,
            {
                **revision.envs,
                **runtime_secrets,
            },
            revision_id=revision.id,
            min_scale=revision.min_scale,
            idle_seconds=revision.idle_seconds,
            migrate=revision.deployed_at is None,
        )

    # Publish the applied release only after workload readiness.
    logger.info("Publishing Solution %s", solution.id)
    async with session_scope() as session:
        await session.execute(
            update(Solution)
            .where(col(Solution.id) == solution.id, col(Solution.deleted_at).is_(None))
            .values(status=Status.running, deployed_revision_id=revision.id)
        )
        await session.execute(update(Revision).where(col(Revision.id) == revision.id).values(deployed_at=datetime.now(UTC)))
        await session.commit()


async def delete(solution_id: UUID) -> None:
    """Delete the Solution workload, schema, and credentials."""

    # An absent tombstone means a previous execution completed cleanup.
    async with session_scope() as session:
        target = await organizations.solution_infrastructure(session, solution_id)
        if target is None:
            logger.info("Solution %s no longer exists; skipping deletion", solution_id)
            return
        solution, organization, compute = target
        if organization.deleted_at is not None:
            return

    # Remove Solution Kubernetes resources before revoking provider credentials.
    logger.info("Deleting Kubernetes workload for Solution %s", solution.id)
    cluster = Kubernetes(
        compute.kubeconfig,
    )
    async with cluster:
        await cluster.solutions.delete(organization.id, solution.id)
        db = await databases.connection(organization, cluster)
        logger.info("Deleting PostgreSQL schema for Solution %s", solution.id)
        await db.delete_solution_schema(organization.id, solution.id)

        # Revoke the service account before owner credentials remove its private objects.
        storage = Storage(compute, cluster)
        await storage.revoke(solution.id)
        await storage.delete_prefix(organization.id, f"solutions/{solution.id.hex}/")

    # Purge the tombstone only after all external resources are absent.
    logger.info("Purging Solution %s", solution.id)
    async with session_scope() as session:
        # The delete statement locks the tombstone while making completed cleanup idempotent.
        await session.execute(
            update(Solution).where(col(Solution.id) == solution_id).values(desired_revision_id=None, deployed_revision_id=None)
        )
        await session.execute(sql_delete(Solution).where(col(Solution.id) == solution_id))
        await session.commit()
