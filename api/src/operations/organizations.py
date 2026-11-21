import src.database.services.organizations
from uuid import UUID
from datetime import UTC, datetime
from sqlmodel import col
from src.utils import stripe
from sqlalchemy import or_, select
from sqlalchemy import delete as sql_delete
from src.kubernetes import utils, namespace, organizations
from src.kubernetes import databases as database_resources
from src.operations import invoices, databases, registries
from src.models.statuses import Status
from src.database.session import session_scope
from src.kubernetes.client import Kubernetes
from src.models.operations import OperationKind
from src.kubernetes.storage import Storage
from src.models.organizations import OrganizationUsageUpdate
from src.database.models.solutions import Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def reconcile(operation: Operation) -> None:
    """Provision the Organization database, then reconcile its boundary and publish it."""

    # Read only this claimed request, never another request's desired allocation.
    async with session_scope() as session:
        claimed = await session.get(Operation, operation.id)
        if (
            claimed is None
            or claimed.kind != OperationKind.organization_create
            or claimed.target_id != operation.target_id
            or claimed.finished_at is not None
            or claimed.lease_expires_at != operation.lease_expires_at
            or claimed.lease_expires_at is None
            or claimed.lease_expires_at <= datetime.now(UTC)
        ):
            raise RuntimeError("Operation lease was lost")
        allocation = OrganizationUsageUpdate.model_validate(claimed.allocation) if claimed.allocation is not None else None

    # Fence preparation and capacity changes against deletion and competing transitions.
    async with databases.reconciling(operation.target_id) as lease:
        if lease is None:
            return

        # Capture confirmed state and detached desired capacity before provider I/O.
        async with session_scope() as session:
            target = await src.database.services.organizations.infrastructure(session, operation.target_id)
        if target is None:
            return
        organization, compute = target
        if organization.deleted_at is not None:
            return
        desired = allocation or OrganizationUsageUpdate.model_validate(organization, from_attributes=True)

        # Prepare confirmed database defaults before applying purchased capacity.
        cluster = Kubernetes(compute.kubeconfig)
        await databases.prepare(lease, organization, cluster, compute.database_storage_class)

        # Reconcile independent pools using only the frozen desired snapshot.
        await lease.check()
        await database_resources.wait_ready(cluster, organization.id)
        await organizations.apply(
            cluster, organization.id, cpu_millicores=desired.compute_cpu_millicores, ram_bytes=desired.compute_ram_bytes
        )
        storage = Storage(compute, cluster)
        await storage.apply(organization.id, quota_bytes=desired.storage_bytes)
        await database_resources.resize(
            cluster,
            organization.id,
            storage_bytes=desired.database_storage_bytes,
            cpu_millicores=desired.database_cpu_millicores,
            ram_bytes=desired.database_ram_bytes,
        )
        await database_resources.wait_ready(cluster, organization.id)
        await registries.synchronize(cluster, organization.id)

        # Lock both ownership records before publishing any confirmed capacity.
        async with session_scope() as session:
            current = await src.database.services.organizations.lock_row(session, organization.id)
            claimed = await session.get(Operation, operation.id, populate_existing=True, with_for_update=True)
            if (
                current is None
                or current.deleted_at is not None
                or not await lease.owned(session)
                or claimed is None
                or claimed.finished_at is not None
                or claimed.lease_expires_at != operation.lease_expires_at
                or claimed.lease_expires_at is None
                or claimed.lease_expires_at <= datetime.now(UTC)
            ):
                raise RuntimeError("Operation lease was lost")

            # A different allocation request supersedes these provider results without lending its payload.
            pending_statement = select(col(Operation.id)).where(
                col(Operation.id) != operation.id,
                col(Operation.target_id) == organization.id,
                col(Operation.kind) == OperationKind.organization_create,
                col(Operation.allocation).is_not(None),
            )
            if allocation is not None:
                pending_statement = pending_statement.where(
                    or_(
                        col(Operation.created_at) > claimed.created_at,
                        (col(Operation.created_at) == claimed.created_at) & (col(Operation.id) > claimed.id),
                    )
                )
            else:
                pending_statement = pending_statement.where(col(Operation.finished_at).is_(None))
            pending = await session.scalar(pending_statement.limit(1))
            if pending is not None:
                return

            # Close elapsed billing periods using the old confirmed allocation.
            period_end = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            invoices.capture(session, current, period_end)
            if allocation is not None:
                for name, value in allocation.model_dump().items():
                    setattr(current, name, value)
            if current.provisioned_at is None:
                current.provisioned_at = datetime.now(UTC)
                current.status = Status.running
            elif allocation is not None:
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
