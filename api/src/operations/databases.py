import asyncio
import contextlib
from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from sqlalchemy import text, delete, select, update
from dataclasses import dataclass
from src.kubernetes import databases as database_resources
from collections.abc import AsyncGenerator
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import DatabaseState
from src.database.models.computes import ComputeRegistry
from src.database.models.organizations import Organization, OrganizationActivity


@dataclass
class Lease:
    """Fence an exclusive transition using its last committed expiry as an ownership token."""

    organization_id: UUID
    expires_at: datetime
    lost: bool = False

    async def owned(self, session: AsyncSession) -> bool:
        """Check ownership after the caller locks the Organization."""

        # Expired workers cannot publish results or renew a replacement worker's lease.
        row = await session.get(OrganizationActivity, self.organization_id, populate_existing=True)
        return row is not None and row.expires_at == self.expires_at and row.expires_at > datetime.now(UTC)

    async def check(self) -> None:
        """Reject stale transition workers immediately before external operations."""

        # Release the admission lock before external I/O; Kubernetes still needs its own strict fencing.
        async with session_scope() as session:
            organization = await organizations.lock_row(session, self.organization_id)
            if organization is None or organization.deleted_at is not None or self.lost or not await self.owned(session):
                raise RuntimeError("Organization transition lease was lost")

    @contextlib.asynccontextmanager
    async def maintain(self) -> AsyncGenerator[None]:
        """Renew a lease and interrupt its work if persistence or ownership is lost."""

        # Associate lease loss with the operation task that owns this maintenance scope.
        if self.lost or self.expires_at <= datetime.now(UTC):
            raise RuntimeError("Organization activity lease was lost")
        task = asyncio.current_task()
        if task is None:
            raise RuntimeError("Organization activity requires an asynchronous task")

        async def renew() -> None:
            """Extend the lease only while this worker still owns it."""

            try:
                while True:
                    await asyncio.sleep(30)

                    # Bound renewal so a stalled database cannot hold the owner indefinitely.
                    async with asyncio.timeout(30), session_scope() as session:
                        await organizations.lock_row(session, self.organization_id)

                        # Renewal must not extend a replacement owner's lease.
                        if not await self.owned(session):
                            raise RuntimeError("Organization activity lease was lost")
                        expires_at = datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=180)
                        await session.execute(
                            update(OrganizationActivity)
                            .where(col(OrganizationActivity.organization_id) == self.organization_id)
                            # Renew only the current Organization's activity row.
                            .values(expires_at=expires_at)
                        )
                        self.expires_at = expires_at
                        await session.commit()
            except Exception:

                # Losing renewal cancels the operation still running under this lease.
                self.lost = True
                if not task.done():
                    task.cancel()
                raise

        renewal = asyncio.create_task(renew())

        # Keep renewal alive for the full operation scope, including cancellation cleanup.
        try:
            yield
        finally:
            try:
                renewal.cancel()

                # Reap the renewal task before releasing its activity lease.
                with contextlib.suppress(asyncio.CancelledError):
                    await renewal

            # Conditional release cannot delete a replacement lease after crash recovery.
            finally:
                async with session_scope() as session:
                    organization = await organizations.lock_row(session, self.organization_id)

                    # Delete only the activity row protected by this lease.
                    if organization is not None and await self.owned(session):
                        await session.execute(
                            delete(OrganizationActivity).where(col(OrganizationActivity.organization_id) == self.organization_id)
                        )
                    await session.commit()


async def _claim(session: AsyncSession, organization_id: UUID) -> Lease | None:
    """Claim the exclusive transition lease after the caller locks its Organization."""

    # The Organization UUID reserves one lease slot for exclusive database transitions.
    now = datetime.now(UTC)
    await session.execute(
        delete(OrganizationActivity).where(
            col(OrganizationActivity.organization_id) == organization_id, col(OrganizationActivity.expires_at) <= now
        )
    )
    if await session.get(OrganizationActivity, organization_id) is not None:
        return None

    # Reserve the transition after removing expired activity.
    row = OrganizationActivity(organization_id=organization_id, expires_at=now.replace(microsecond=0) + timedelta(seconds=180))
    session.add(row)
    await session.flush()
    return Lease(organization_id, row.expires_at)


@contextlib.asynccontextmanager
async def deleting(organization_id: UUID) -> AsyncGenerator[None]:
    """Drain admitted work and fence database transitions during destructive cleanup."""

    # Serialize deletion eligibility and lease admission under the same Organization lock.
    while True:
        async with session_scope() as session:
            organization = await organizations.lock_row(session, organization_id)

            # An absent Organization has already completed cleanup.
            if organization is None:
                break

            # Lifecycle cleanup must never remove an active tenant database.
            if organization.deleted_at is None:
                raise HTTPException(status_code=403, detail="Active Organizations cannot be deleted by lifecycle cleanup")
            lease = await _claim(session, organization_id)
            await session.commit()

        # Hold the admitted deletion lease throughout external cleanup.
        if lease is not None:
            async with lease.maintain():
                yield
            return
        await asyncio.sleep(0.5)

    # An already-removed Organization needs no external deletion lease.
    yield


async def ready(organization_id: UUID) -> bool:
    """Provision the database behind one persisted transition lease."""

    # Provisioning decisions share the same short write transaction.
    while True:
        async with session_scope() as session:
            organization = await organizations.lock_row(session, organization_id)

            # Provisioning cannot revive an absent or deleted Organization.
            if organization is None or organization.deleted_at is not None:
                return False

            # Available databases can be reused only outside an active transition.
            transition = await session.get(OrganizationActivity, organization_id)
            if organization.database_state == DatabaseState.available and (
                transition is None or transition.expires_at <= datetime.now(UTC)
            ):
                return True
            lease = await _claim(session, organization_id)
            await session.commit()

        # Another transition may finish while this caller waits for admission.
        if lease is None:
            await asyncio.sleep(0.5)
            continue

        async with lease.maintain():

            # Load only the database assignment without decrypting unrelated storage credentials.
            try:
                async with session_scope() as session:
                    result = await session.execute(
                        # Fetch only the database provisioning assignment.
                        select(Organization, col(ComputeRegistry.kubeconfig), col(ComputeRegistry.database_storage_class))
                        .join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
                        .where(col(Organization.id) == organization_id)
                    )

                    # Consume the query before releasing its session.
                    target = result.one_or_none()
                if target is None:
                    raise RuntimeError("Organization is unavailable")
                organization, kubeconfig, database_storage_class = target
                cluster = Kubernetes(kubeconfig)

                # Revalidate ownership before mutating cluster resources.
                await lease.check()

                # New infrastructure needs provisioning before PostgreSQL initialization.
                if organization.status != Status.running:
                    await database_resources.apply(
                        cluster,
                        organization_id,
                        organization.database_password,
                        # Preserve the Compute's selected persistent storage class.
                        database_storage_class,
                        size_mib=organization.database_size_mib,
                        instances=organization.database_instances,
                    )

                # Existing infrastructure must be ready before using PostgreSQL.
                else:
                    await database_resources.wait_ready(cluster, organization_id)
                async with database_resources.connection(organization, cluster) as database:
                    if organization.status != Status.running:
                        await lease.check()

                        # Prepare PostgreSQL roles only while the transition is still owned.
                        await database.prepare_organization_database(organization_id)

                    # Verify ownership before checking the tenant connection and publishing readiness.
                    await lease.check()

                    # Verify the tenant connection immediately before publication.
                    async with asyncio.timeout(10), database.connection(organization_id.hex) as sql:
                        await sql.execute(text("SELECT 1"))

                    # Publish the provisioned database.
                    async with session_scope() as session:
                        organization = await organizations.lock_row(session, organization_id)

                        # A lost lease cannot publish infrastructure as available.
                        if organization is None or organization.deleted_at is not None or not await lease.owned(session):
                            raise RuntimeError("Organization transition lease was lost")
                        organization.database_state = DatabaseState.available
                        await session.commit()

                        # Availability is visible only after the transaction commits.
                        return True

            # Interrupted provisioning is retried through the failed state.
            except BaseException:

                # Persist failure without changing a replacement lease's state.
                async with session_scope() as session:
                    organization = await organizations.lock_row(session, organization_id)

                    # Do not overwrite a replacement worker's transition state.
                    if organization is not None and await lease.owned(session):
                        organization.database_state = DatabaseState.failed
                    await session.commit()
                raise
