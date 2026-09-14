import secrets
import contextlib
from uuid import UUID
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import select, update
from src.logger import logger
from src.kubernetes import namespace
from src.operations import databases
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Revision, Solution
from src.database.models.organizations import Organization


async def deploy(revision_id: UUID) -> None:
    """Keep the database awake through schema provisioning, migrations, and readiness."""

    # Admission needs only the organization identity; refresh the full target after waking SQL.
    async with session_scope() as session:
        organization_id = await session.scalar(
            select(col(Solution.organization_id))
            .join(Revision, col(Revision.solution_id) == col(Solution.id))
            .where(col(Revision.id) == revision_id, col(Solution.deleted_at).is_(None))
        )
        if organization_id is None:
            return
    async with databases.activity(organization_id):
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
            solution, infrastructure = target
            if revision.id != solution.effective_revision_id:
                return
            if solution.deleted_at is not None:
                return
            await session.execute(update(Solution).where(col(Solution.id) == solution_id).values(status=Status.creating))
            await session.commit()
        organization = infrastructure.organization
        runtime_secrets = dict(solution.secrets)
        secrets_changed = False
        database_certificate: str | None = None

        # Organization reconciliation owns bucket provisioning and quota admission.
        cluster = Kubernetes(
            infrastructure.compute.kubeconfig,
        )
        async with contextlib.aclosing(cluster):
            bucket = cluster.storage.bucket(organization.id, infrastructure.compute)

            # Reuse generated credentials after an interrupted creation attempt.
            if "LONGLINK_ENV" not in runtime_secrets:
                # RustFS service accounts are scoped to this Solution and owner keys never reach workloads.
                prefix = f"solutions/{solution.id.hex}/"
                logger.info("Creating object storage credentials for Solution %s", solution.id)
                database_password = secrets.token_urlsafe(24)
                credentials = await bucket.admin.service_account(bucket.name, solution.id)
                database, database_certificate = await databases.connection(organization, cluster)
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
                    "LONGLINK_STORAGE_BUCKET": bucket.name,
                    "LONGLINK_STORAGE_ENDPOINT_URL": infrastructure.compute.storage_endpoint,
                    "LONGLINK_STORAGE_PASSWORD": credentials.secret_key,
                    "LONGLINK_STORAGE_PREFIX": prefix,
                    "LONGLINK_STORAGE_REGION": "us-east-1",
                    "LONGLINK_STORAGE_USERNAME": credentials.access_key,
                }

            # Issue a solution-specific key so only Platform-originated requests can assert an audit identity.
            if "LONGLINK_IDENTITY_SECRET" not in runtime_secrets:
                logger.info("Persisting runtime credentials for Solution %s", solution.id)
                runtime_secrets["LONGLINK_IDENTITY_SECRET"] = secrets.token_urlsafe(32)
                secrets_changed = True

            if secrets_changed:
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

            # Reuse the CA fetched for initial schema provisioning; retries fetch the current CA.
            if database_certificate is None:
                database_certificate = await cluster.databases.certificate(organization.id)

            # Apply the captured desired release so reconciliation repairs workload drift.
            logger.info("Applying Kubernetes workload for Solution %s", solution.id)
            await cluster.solutions.apply(
                organization.id,
                solution.id,
                revision.image,
                {
                    **revision.envs,
                    **runtime_secrets,
                    "LONGLINK_DATABASE_CERTIFICATE": database_certificate,
                    **(
                        {"LONGLINK_STORAGE_CERTIFICATE": infrastructure.compute.storage_certificate}
                        if infrastructure.compute.storage_certificate
                        else {}
                    ),
                },
                revision_id=revision.id,
                min_scale=revision.min_scale,
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
            await session.execute(update(Revision).where(col(Revision.id) == revision.id).values(deployed_at=utcnow()))
            await session.commit()


async def delete(solution_id: UUID) -> None:
    """Protect workload and schema cleanup from database hibernation."""

    # Admission needs only an active Organization identity with an assigned Compute target.
    async with session_scope() as session:
        organization_id = await session.scalar(
            select(col(Solution.organization_id))
            .join(Organization, col(Organization.id) == col(Solution.organization_id))
            .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
            .where(col(Solution.id) == solution_id, col(Organization.deleted_at).is_(None))
        )
        if organization_id is None:
            return
    async with databases.activity(organization_id):
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
        cluster = Kubernetes(
            infrastructure.compute.kubeconfig,
        )
        async with contextlib.aclosing(cluster):
            await cluster.solutions.delete(organization.id, solution.id)
            db, _ = await databases.connection(organization, cluster)
            logger.info("Deleting PostgreSQL schema for Solution %s", solution.id)
            await db.delete_solution_schema(organization.id, solution.id)

            # Revoke the service account before owner credentials remove its private objects.
            bucket = cluster.storage.bucket(organization.id, infrastructure.compute)
            await bucket.admin.revoke(solution.id)
            await bucket.storage.delete_prefix(bucket.name, f"solutions/{solution.id.hex}/")

        # Purge the tombstone only after all external resources are absent.
        logger.info("Purging Solution %s", solution.id)
        async with session_scope() as session:
            # The delete statement locks the tombstone while making completed cleanup idempotent.
            await session.execute(
                update(Solution).where(col(Solution.id) == solution.id).values(desired_revision_id=None, deployed_revision_id=None)
            )
            await session.execute(sql_delete(Solution).where(col(Solution.id) == solution.id))
            await session.commit()
