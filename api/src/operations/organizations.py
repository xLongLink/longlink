import src.database.services.organizations
from uuid import UUID
from sqlmodel import col
from src.utils import stripe
from sqlalchemy import delete as sql_delete
from sqlalchemy import select, update
from src.kubernetes import databases as database_resources
from src.kubernetes import organizations
from src.operations import databases, registries
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
    async with cluster:
        # Card registration can expand capacity independently of the free pricing allowance.
        if organization.stripe_payment_method_id is not None:
            await database_resources.resize(
                cluster, organization.id, size_mib=organization.database_size_mib, instances=organization.database_instances
            )
        storage = Storage(compute, cluster)
        await storage.apply(organization.id, quota_bytes=organization.storage_quota_bytes)
        await organizations.apply(cluster, organization.id)
        await registries.synchronize(cluster, organization.id)

    # Publish the Organization after its provider and Kubernetes boundaries are ready.
    async with session_scope() as session:
        await session.execute(
            update(Organization)
            .where(
                col(Organization.id) == organization.id,
                col(Organization.deleted_at).is_(None),
                col(Organization.status).in_((Status.creating, Status.failed)),
            )
            .values(status=Status.running)
        )

        await session.commit()


async def delete(organization_id: UUID) -> None:
    """Drain runtime activity before destroying the Organization's boundaries."""

    # Delegate deletion eligibility and lease admission to the locked database scope.
    async with databases.deleting(organization_id):
        # An absent tombstone means a previous execution completed cleanup.
        async with session_scope() as session:
            target = await src.database.services.organizations.infrastructure(session, organization_id)
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
                async for hosted in checkouts.auto_paging_iter():
                    if hosted.status == "open":
                        await connection.v1.checkout.sessions.expire_async(hosted.id)

        # Release the read session before acquiring external cleanup resources.
        cluster = Kubernetes(compute.kubeconfig)

        # Namespace deletion cascades every Solution Kubernetes resource and waits for all Pods to terminate.
        async with cluster:
            await organizations.delete(cluster, organization.id)

            # Delete the dedicated CNPG boundary only after compute Pods have terminated.
            await database_resources.delete(cluster, organization.id)
            storage = Storage(compute, cluster)
            await storage.delete(organization.id, solution_ids)

        # Purge the tombstone only after all external resources are absent.
        async with session_scope() as session:
            await session.execute(sql_delete(Organization).where(col(Organization.id) == organization.id))
            await session.commit()
