import src.database.services.organizations
from uuid import UUID
from datetime import UTC, datetime
from sqlmodel import col
from src.utils import stripe
from sqlalchemy import delete as sql_delete
from sqlalchemy import select
from src.kubernetes import utils, namespace, organizations
from src.kubernetes import databases as database_resources
from src.operations import invoices, databases, registries
from src.models.statuses import Status
from src.database.session import session_scope
from src.kubernetes.client import Kubernetes
from src.kubernetes.storage import Storage
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


async def reconcile(organization_id: UUID) -> None:
    """Provision the Organization database, then reconcile its boundary and publish it."""

    # Provision the database before Solutions receive scoped credentials.
    if not await databases.ready(organization_id):
        return

    # Skip removed Organizations.
    async with session_scope() as session:
        target = await src.database.services.organizations.infrastructure(session, organization_id)
    if target is None:
        return
    organization, compute = target
    if organization.deleted_at is not None:
        return

    # Converge the Organization bucket before Solutions receive scoped credentials.
    cluster = Kubernetes(compute.kubeconfig)

    # Reconcile the independent application and file pools directly.
    await database_resources.wait_ready(cluster, organization.id)
    await organizations.apply(
        cluster, organization.id, cpu_millicores=organization.compute_cpu_millicores, ram_bytes=organization.compute_ram_bytes
    )
    storage = Storage(compute, cluster)
    await storage.apply(organization.id, quota_bytes=organization.storage_bytes)

    # Reconcile the database pool separately.
    await database_resources.resize(
        cluster,
        organization.id,
        storage_bytes=organization.database_storage_bytes,
        cpu_millicores=organization.database_cpu_millicores,
        ram_bytes=organization.database_ram_bytes,
    )
    await database_resources.wait_ready(cluster, organization.id)

    # Apply shared tenant infrastructure after storage capacity is configured.
    await registries.synchronize(cluster, organization.id)

    # Publish only the allocation snapshot that actually converged across providers.
    async with session_scope() as session:
        current = await src.database.services.organizations.lock_row(session, organization.id)
        if current is None or current.deleted_at is not None:
            return
        fields = (
            "compute_cpu_millicores",
            "compute_ram_bytes",
            "storage_bytes",
            "database_cpu_millicores",
            "database_ram_bytes",
            "database_storage_bytes",
        )
        if any(getattr(current, field) != getattr(organization, field) for field in fields):
            return

        # Close elapsed billing periods using the previous successfully applied allocation.
        period_end = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        invoices.capture(session, current, period_end)
        current.applied_cpu_millicores = organization.compute_cpu_millicores + organization.database_cpu_millicores
        current.applied_ram_bytes = organization.compute_ram_bytes + organization.database_ram_bytes
        current.applied_storage_bytes = organization.storage_bytes + organization.database_storage_bytes
        current.status = Status.running
        await session.commit()


async def delete(organization_id: UUID) -> None:
    """Drain runtime activity before destroying the Organization's boundaries."""

    # Delegate deletion eligibility and lease admission; absent tombstones mean cleanup is complete.
    async with databases.deleting(organization_id):
        async with session_scope() as session:
            target = await src.database.services.organizations.infrastructure(session, organization_id)

            # A completed deletion leaves no infrastructure target to revisit.
            if target is None:
                return
            organization, compute = target

            # Collect every retained Solution account before external cleanup.
            result = await session.scalars(select(col(Solution.id)).where(col(Solution.organization_id) == organization_id))
            solution_ids = result.all()

        # Expire hosted card-registration attempts before removing the Organization.
        if organization.stripe_customer_id is not None:
            async with stripe.client() as connection:
                checkouts = await connection.v1.checkout.sessions.list_async({"customer": organization.stripe_customer_id, "limit": 100})

                # Expire all open sessions, including those from interrupted requests.
                async for hosted in checkouts.auto_paging_iter():
                    # Closed checkout sessions no longer accept card-registration attempts.
                    if hosted.status == "open":
                        await connection.v1.checkout.sessions.expire_async(hosted.id)

        # Release the read session before acquiring external cleanup resources.
        cluster = Kubernetes(compute.kubeconfig)

        # Namespace deletion cascades every Solution Kubernetes resource and waits for all Pods to terminate.
        await utils.delete_namespace(await cluster.api(), namespace.compute(organization.id))

        # Delete the dedicated CNPG boundary only after compute Pods have terminated.
        await utils.delete_namespace(await cluster.api(), namespace.database(organization.id))
        storage = Storage(compute, cluster)
        await storage.delete(organization.id, solution_ids)

        # Purge the tombstone only after all external resources are absent.
        async with session_scope() as session:
            await session.execute(sql_delete(Organization).where(col(Organization.id) == organization.id))
            await session.commit()
