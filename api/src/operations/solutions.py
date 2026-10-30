import secrets
from uuid import UUID
from typing import cast
from datetime import UTC, datetime
from sqlmodel import col
from sqlalchemy import delete as sql_delete
from sqlalchemy import update
from src.kubernetes import databases as database_resources
from src.kubernetes import namespace
from src.kubernetes import solutions as solution_resources
from src.operations import registries
from sqlalchemy.engine import CursorResult
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

        # Deleted or unavailable parents cannot accept a deployment.
        target = await organizations.solution_infrastructure(session, solution_id)
        if target is None:
            return
        solution, organization, compute = target
        if revision.id != solution.effective_revision_id:
            return

        # Tombstoned Solutions cannot accept a captured deployment command.
        if solution.deleted_at is not None:
            return
        await session.execute(update(Solution).where(col(Solution.id) == solution_id).values(status=Status.creating))
        await session.commit()
        runtime_secrets = dict(solution.secrets)

    # Infrastructure owns these settings; discard copies retained by earlier deployments.
    for name in (
        "LONGLINK_ENV",
        "LONGLINK_DATABASE_HOST",
        "LONGLINK_DATABASE_NAME",
        "LONGLINK_DATABASE_PORT",
        "LONGLINK_DATABASE_SCHEMA",
        "LONGLINK_STORAGE_BUCKET",
        "LONGLINK_STORAGE_PREFIX",
        "LONGLINK_STORAGE_REGION",
        "LONGLINK_STORAGE_ENDPOINT_URL",
        "LONGLINK_DATABASE_CERTIFICATE",
        "LONGLINK_STORAGE_CERTIFICATE",
    ):
        runtime_secrets.pop(name, None)

    # Organization reconciliation owns bucket provisioning and quota admission.
    cluster = Kubernetes(compute.kubeconfig)
    async with cluster:
        storage = Storage(compute, cluster)

        # Use one current CA snapshot for SQL provisioning and workload rendering in this attempt.
        database_certificate = await database_resources.certificate(cluster, organization.id)

        # Reuse generated credentials; new RustFS accounts remain scoped to this Solution.
        if "LONGLINK_DATABASE_PASSWORD" not in runtime_secrets:
            database_password = secrets.token_urlsafe(24)
            credentials = await storage.service_account(organization.id, solution.id)
            database = await database_resources.connection(organization, cluster, certificate=database_certificate)
            database_username = await database.solution_schema(organization.id, solution.id, database_password)

            # Build the durable runtime credentials before creating the workload.
            runtime_secrets.update(
                {
                    "LONGLINK_DATABASE_PASSWORD": database_password,
                    "LONGLINK_DATABASE_USERNAME": database_username,
                    "LONGLINK_STORAGE_PASSWORD": credentials.secret_key,
                    "LONGLINK_STORAGE_USERNAME": credentials.access_key,
                }
            )

        # Issue a solution-specific key so only Platform-originated requests can assert an audit identity.
        if "LONGLINK_IDENTITY_SECRET" not in runtime_secrets:
            runtime_secrets["LONGLINK_IDENTITY_SECRET"] = secrets.token_urlsafe(32)

        # Resolve current infrastructure settings without persisting a second configuration owner.
        runtime_environment = {
            **revision.envs,
            **runtime_secrets,
            "LONGLINK_ENV": "production",
            "LONGLINK_DATABASE_HOST": namespace.database_hostname(organization.id),
            "LONGLINK_DATABASE_NAME": organization.id.hex,
            "LONGLINK_DATABASE_PORT": "5432",
            "LONGLINK_DATABASE_SCHEMA": solution.id.hex,
            "LONGLINK_STORAGE_BUCKET": storage.bucket_name(organization.id),
            "LONGLINK_STORAGE_PREFIX": f"solutions/{solution.id.hex}/",
            "LONGLINK_STORAGE_REGION": "us-east-1",
            # Workloads always reach object storage through the cluster-local TLS proxy.
            "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
            "LONGLINK_DATABASE_CERTIFICATE": database_certificate,
            **({"LONGLINK_STORAGE_CERTIFICATE": compute.storage_certificate} if compute.storage_certificate else {}),
        }

        # Persist generated credentials when the runtime contract changed.
        if runtime_secrets != solution.secrets:
            # Persist credentials only while the Solution remains active.
            async with session_scope() as session:
                result = cast(
                    CursorResult[tuple[object, ...]],
                    await session.execute(
                        update(Solution)
                        .where(col(Solution.id) == solution.id, col(Solution.deleted_at).is_(None))
                        # Store generated credentials only on a still-active Solution.
                        .values(secrets=runtime_secrets)
                    ),
                )

                # Stop if deletion won the race with credential persistence.
                if result.rowcount != 1:
                    return

                await session.commit()

        # Apply the captured desired release so reconciliation repairs workload drift.
        if revision.registry_connection_id is not None:
            await registries.synchronize(cluster, organization.id)
        await solution_resources.apply(
            cluster,
            organization.id,
            solution.id,
            revision.image,
            runtime_environment,
            # Replays reuse the captured release and skip already-completed migrations.
            revision_id=revision.id,
            migrate=revision.deployed_at is None,
            registry_connection_id=revision.registry_connection_id,
        )

    # Publish the applied release only after workload readiness.
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
        target = await organizations.solution_cleanup_infrastructure(session, solution_id)
        if target is None:
            return
        organization, compute = target

        # Organization cleanup owns resources once its parent is tombstoned.
        if organization.deleted_at is not None:
            return

    # Remove Solution Kubernetes resources before revoking provider credentials.
    cluster = Kubernetes(compute.kubeconfig)
    async with cluster:
        await solution_resources.delete(cluster, organization.id, solution_id)
        db = await database_resources.connection(organization, cluster)
        await db.delete_solution_schema(organization.id, solution_id)

        # Revoke the service account before owner credentials remove its private objects.
        storage = Storage(compute, cluster)
        await storage.delete_solution(organization.id, solution_id)

    # Purge the locked tombstone only after all external resources are absent.
    async with session_scope() as session:
        await session.execute(
            update(Solution).where(col(Solution.id) == solution_id).values(desired_revision_id=None, deployed_revision_id=None)
        )
        await session.execute(sql_delete(Solution).where(col(Solution.id) == solution_id))
        await session.commit()
