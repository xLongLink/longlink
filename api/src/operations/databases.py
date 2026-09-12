import asyncio
import contextlib
from uuid import UUID
from datetime import datetime, timedelta
from sqlmodel import col
from sqlalchemy import text, delete, select, update
from dataclasses import field, dataclass
from collections.abc import Iterator, AsyncIterator
from src.environments import env
from src.models.types import DatabaseSSLMode
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import DatabaseState
from src.database.models.organizations import Organization, OrganizationActivity

# Load the loopback-only SQL transport solely for the host-run development process.
if env.DEVELOPMENT:
    from src.development import postgres
else:
    from src.utils import postgres

LEASE_SECONDS = 180
RENEW_SECONDS = 30


async def lock(session: AsyncSession, organization_id: UUID) -> Organization | None:
    """Serialize admission and transitions on SQLite, PostgreSQL, and MySQL."""

    # An UPDATE takes a write lock even where SELECT FOR UPDATE is unsupported.
    await session.execute(
        update(Organization).where(col(Organization.id) == organization_id).values(updated_at=col(Organization.updated_at))
    )
    return await session.get(Organization, organization_id, populate_existing=True)


async def connection(infrastructure: organizations.Infrastructure, cluster: Kubernetes) -> postgres.Postgres:
    """Build the Organization's private, CA-verified PostgreSQL connection."""

    # Persisted credentials remain authoritative; Kubernetes supplies the server trust anchor.
    organization = infrastructure.organization
    port = 5432

    # Host-run development workers reach private SQL through the authenticated Kubernetes API.
    if env.DEVELOPMENT:
        port = await cluster.databases.portforward(organization.id)

    # Preserve the cluster DNS hostname for certificate verification even through a local tunnel.
    return postgres.Postgres(
        host=f"database-rw.longlink-database-{organization.id.hex}.svc.cluster.local",
        port=port,
        username="postgres",
        password=organization.database_password,
        sslmode=DatabaseSSLMode.require,
        certificate=await cluster.databases.certificate(organization.id),
    )


@dataclass
class Lease:
    """Fence a renewable activity using its last committed expiry as an ownership token."""

    id: UUID
    organization_id: UUID
    expires_at: datetime
    consumers: set[asyncio.Task[object]] = field(default_factory=set)
    lost: bool = False

    @contextlib.contextmanager
    def protect(self) -> Iterator[None]:
        """Register the actual consuming task, including Starlette's streaming task."""

        # A response may start in a different task after its admission task has finished.
        if self.lost or self.expires_at <= utcnow():
            raise RuntimeError("Organization activity lease was lost")
        task = asyncio.current_task()
        if task is None:
            raise RuntimeError("Organization activity requires an asynchronous task")
        registered = task not in self.consumers
        if registered:
            self.consumers.add(task)
        try:
            yield
        finally:
            if registered:
                self.consumers.discard(task)

    async def owned(self, session: AsyncSession) -> bool:
        """Check ownership after the caller locks the Organization."""

        # Expired workers cannot publish results or renew a replacement worker's lease.
        row = await session.get(OrganizationActivity, self.id, populate_existing=True)
        return row is not None and row.expires_at == self.expires_at and row.expires_at > utcnow()

    async def check(self) -> None:
        """Reject stale transition workers immediately before external operations."""

        # Release the admission lock before external I/O; Kubernetes still needs its own strict fencing.
        async with session_scope() as session:
            organization = await lock(session, self.organization_id)
            if organization is None or organization.deleted_at is not None or self.lost or not await self.owned(session):
                raise RuntimeError("Organization transition lease was lost")

    @contextlib.asynccontextmanager
    async def maintain(self) -> AsyncIterator[None]:
        """Renew a lease and interrupt its work if persistence or ownership is lost."""

        async def renew() -> None:
            """Extend the lease only while this worker still owns it."""

            try:
                while True:
                    await asyncio.sleep(RENEW_SECONDS)
                    async with asyncio.timeout(RENEW_SECONDS), session_scope() as session:
                        await lock(session, self.organization_id)
                        if not await self.owned(session):
                            raise RuntimeError("Organization activity lease was lost")
                        expires_at = utcnow().replace(microsecond=0) + timedelta(seconds=LEASE_SECONDS)
                        await session.execute(
                            update(OrganizationActivity).where(col(OrganizationActivity.id) == self.id).values(expires_at=expires_at)
                        )
                        self.expires_at = expires_at
                        await session.commit()
            except Exception:
                self.lost = True
                for consumer in self.consumers:
                    if not consumer.done():
                        consumer.cancel()
                raise

        renewal = asyncio.create_task(renew())
        try:
            with self.protect():
                yield
        finally:
            try:
                renewal.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await renewal
            finally:
                # Conditional release cannot delete a replacement lease after crash recovery.
                async with session_scope() as session:
                    organization = await lock(session, self.organization_id)
                    if organization is not None and await self.owned(session):
                        await session.execute(delete(OrganizationActivity).where(col(OrganizationActivity.id) == self.id))
                        if self.id != self.organization_id:
                            organization.database_last_active_at = utcnow()
                    await session.commit()


async def _claim(session: AsyncSession, organization_id: UUID, *, transition: bool = False) -> Lease | None:
    """Insert an activity after the caller has locked its Organization."""

    # The Organization UUID reserves one lease slot for exclusive database transitions.
    now = utcnow()
    await session.execute(
        delete(OrganizationActivity).where(
            col(OrganizationActivity.organization_id) == organization_id,
            col(OrganizationActivity.expires_at) <= now,
        )
    )
    if transition and await session.get(OrganizationActivity, organization_id) is not None:
        return None
    row = OrganizationActivity(organization_id=organization_id, expires_at=now.replace(microsecond=0) + timedelta(seconds=LEASE_SECONDS))
    if transition:
        row.id = organization_id
    session.add(row)
    await session.flush()
    return Lease(row.id, organization_id, row.expires_at)


@contextlib.asynccontextmanager
async def activity(organization_id: UUID, *, wake: bool = True, recovery: bool = False) -> AsyncIterator[Lease | None]:
    """Keep SQL awake for requests, migrations, deployment, and schema cleanup."""

    # Persist demand before waking; a concurrent hibernation must finish before admission.
    async with session_scope() as session:
        organization = await lock(session, organization_id)
        if organization is None or organization.deleted_at is not None:
            raise RuntimeError("Organization is unavailable")
        transition = await session.get(OrganizationActivity, organization_id)
        lease = None
        admit = wake or (
            organization.status == Status.running
            and organization.database_state == DatabaseState.available
            and (transition is None or transition.expires_at <= utcnow())
        )

        # Recovery is not runtime demand: check fresh state and claim under the same admission lock.
        if recovery:
            admit = (
                organization.status == Status.running
                and (transition is None or transition.expires_at <= utcnow())
                and (
                    organization.database_state in (DatabaseState.failed, DatabaseState.resuming, DatabaseState.hibernating)
                    or organization.database_state == DatabaseState.hibernated
                    and organization.database_idle_seconds == 0
                    or organization.database_state == DatabaseState.available
                    and organization.database_sync_pending
                )
            )
        if admit:
            lease = await _claim(session, organization_id)
            organization.database_last_active_at = utcnow()
        await session.commit()
    if lease is None:
        yield None
        return
    async with lease.maintain():
        if wake:
            await ready(organization_id)
        yield lease


@contextlib.asynccontextmanager
async def deleting(organization_id: UUID) -> AsyncIterator[None]:
    """Drain admitted work and fence database transitions during destructive cleanup."""

    while True:
        async with session_scope() as session:
            organization = await lock(session, organization_id)
            if organization is None:
                break
            if organization.deleted_at is None:
                raise RuntimeError("Active Organizations cannot be deleted")
            active = await session.scalar(
                select(col(OrganizationActivity.id))
                .where(
                    col(OrganizationActivity.organization_id) == organization_id,
                    col(OrganizationActivity.expires_at) > utcnow(),
                )
                .limit(1)
            )
            lease = None if active is not None else await _claim(session, organization_id, transition=True)
            await session.commit()
        if lease is not None:
            async with lease.maintain():
                yield
            return
        await asyncio.sleep(0.5)
    yield


async def ready(organization_id: UUID) -> None:
    """Coalesce wake and shared projection behind one persisted transition lease."""

    while True:
        # Admission and sleep decisions share the same short write transaction.
        async with session_scope() as session:
            organization = await lock(session, organization_id)
            if organization is None or organization.deleted_at is not None:
                raise RuntimeError("Organization is unavailable")
            transition = await session.get(OrganizationActivity, organization_id)
            if (
                organization.database_state == DatabaseState.available
                and not organization.database_sync_pending
                and (transition is None or transition.expires_at <= utcnow())
            ):
                return
            lease = await _claim(session, organization_id, transition=True)
            if lease is not None:
                organization.database_state = DatabaseState.resuming
            await session.commit()
        if lease is None:
            await asyncio.sleep(0.5)
            continue

        async with lease.maintain():
            try:
                async with session_scope() as session:
                    infrastructure = await organizations.infrastructure(session, organization_id)
                if infrastructure is None:
                    raise RuntimeError("Organization is unavailable")
                cluster = Kubernetes(infrastructure.compute.kubeconfig)
                async with contextlib.aclosing(cluster):
                    await lease.check()
                    if infrastructure.organization.status != Status.running:
                        await cluster.databases.apply(
                            organization_id,
                            infrastructure.organization.database_password,
                            infrastructure.compute.database_storage_class,
                            infrastructure.compute.database_size_gib,
                            infrastructure.compute.database_instances,
                        )
                    else:
                        # Reassert the desired annotation even after an expired worker's interrupted sleep.
                        await cluster.databases.resume(organization_id)
                    database = await connection(infrastructure, cluster)
                    if infrastructure.organization.status != Status.running:
                        await lease.check()
                        await database.prepare_organization_database(organization_id)

                    while True:
                        # Clear before taking the snapshot; concurrent mutations set it again.
                        async with session_scope() as session:
                            organization = await lock(session, organization_id)
                            if organization is None or organization.deleted_at is not None or not await lease.owned(session):
                                raise RuntimeError("Organization transition lease was lost")
                            organization.database_sync_pending = False
                            await session.commit()
                        await lease.check()
                        async with session_scope() as session:
                            await organizations.project_users(session, organization_id, database)

                        # Empty snapshots skip SQL; verify the tenant connection immediately before publication.
                        async with asyncio.timeout(10), database._connection(organization_id.hex) as sql:
                            await sql.execute(text("SELECT 1"))

                        # Publish only if no mutation committed after the consumed dirty marker.
                        async with session_scope() as session:
                            organization = await lock(session, organization_id)
                            if organization is None or organization.deleted_at is not None or not await lease.owned(session):
                                raise RuntimeError("Organization transition lease was lost")
                            if not organization.database_sync_pending:
                                organization.database_state = DatabaseState.available
                                await session.commit()
                                return
                            await session.commit()
            except BaseException:
                # An interrupted snapshot is retried even when its dirty marker was already cleared.
                async with session_scope() as session:
                    organization = await lock(session, organization_id)
                    if organization is not None and await lease.owned(session):
                        organization.database_state = DatabaseState.failed
                        organization.database_sync_pending = True
                    await session.commit()
                raise


async def hibernate(organization_id: UUID, *, manual: bool = False) -> bool:
    """Hibernate an idle Organization while fencing new runtime admission."""

    # Recheck both the idle interval and persisted leases under the admission lock.
    async with session_scope() as session:
        organization = await lock(session, organization_id)
        if organization is not None and organization.deleted_at is None and organization.database_state == DatabaseState.hibernated:
            return True
        if (
            organization is None
            or organization.deleted_at is not None
            or organization.status != Status.running
            or organization.database_idle_seconds == 0
            or organization.database_state != DatabaseState.available
            or not manual
            and organization.database_last_active_at + timedelta(seconds=organization.database_idle_seconds) > utcnow()
        ):
            return False
        active = await session.scalar(
            select(col(OrganizationActivity.id))
            .where(
                col(OrganizationActivity.organization_id) == organization_id,
                col(OrganizationActivity.expires_at) > utcnow(),
            )
            .limit(1)
        )
        if active is not None:
            return False
        lease = await _claim(session, organization_id, transition=True)
        assert lease is not None
        organization.database_state = DatabaseState.hibernating
        await session.commit()

    async with lease.maintain():
        try:
            async with session_scope() as session:
                infrastructure = await organizations.infrastructure(session, organization_id)
            if infrastructure is None:
                return False
            cluster = Kubernetes(infrastructure.compute.kubeconfig)
            async with contextlib.aclosing(cluster):
                state = DatabaseState.available
                if await cluster.databases.can_hibernate(organization_id):
                    database = await connection(infrastructure, cluster)
                    usage = await database.database_usage(organization_id.hex)
                    async with session_scope() as session:
                        organization = await lock(session, organization_id)
                        if organization is None or organization.deleted_at is not None or not await lease.owned(session):
                            return False
                        organization.database_usage_bytes = usage
                        organization.database_usage_at = utcnow()
                        active = await session.scalar(
                            select(col(OrganizationActivity.id))
                            .where(
                                col(OrganizationActivity.organization_id) == organization_id,
                                col(OrganizationActivity.id) != lease.id,
                                col(OrganizationActivity.expires_at) > utcnow(),
                            )
                            .limit(1)
                        )
                        if (
                            active is not None
                            or organization.database_idle_seconds == 0
                            or not manual
                            and organization.database_last_active_at + timedelta(seconds=organization.database_idle_seconds) > utcnow()
                        ):
                            organization.database_state = DatabaseState.available
                            await session.commit()
                            return False
                        await session.commit()
                    if await cluster.databases.can_hibernate(organization_id):
                        # New demand interrupts the wait, but only the next fenced resume may publish availability.
                        async def sleep() -> None:
                            """Revalidate the transition inside the task issuing the external mutation."""

                            await lease.check()
                            await cluster.databases.hibernate(organization_id)

                        sleeping = asyncio.create_task(sleep())
                        try:
                            while True:
                                completed, _ = await asyncio.wait({sleeping}, timeout=1)
                                if completed:
                                    await sleeping
                                    state = DatabaseState.hibernated
                                    break
                                async with session_scope() as session:
                                    organization = await lock(session, organization_id)
                                    if organization is None or not await lease.owned(session):
                                        raise RuntimeError("Organization transition lease was lost")
                                    demand = await session.scalar(
                                        select(col(OrganizationActivity.id))
                                        .where(
                                            col(OrganizationActivity.organization_id) == organization_id,
                                            col(OrganizationActivity.id) != lease.id,
                                            col(OrganizationActivity.expires_at) > utcnow(),
                                        )
                                        .limit(1)
                                    )
                                    interrupted = (
                                        demand is not None or organization.deleted_at is not None or organization.database_idle_seconds == 0
                                    )
                                if interrupted:
                                    state = DatabaseState.resuming
                                    break
                        finally:
                            sleeping.cancel()
                            with contextlib.suppress(asyncio.CancelledError):
                                await sleeping
                async with session_scope() as session:
                    organization = await lock(session, organization_id)
                    if organization is not None and await lease.owned(session):
                        organization.database_state = state
                    await session.commit()
                return state == DatabaseState.hibernated
        except BaseException:
            async with session_scope() as session:
                organization = await lock(session, organization_id)
                if organization is not None and await lease.owned(session):
                    organization.database_state = DatabaseState.failed
                await session.commit()
            raise


async def reconcile(organization_id: UUID) -> None:
    """Recover interrupted transitions and synchronize awake Organizations."""

    async with session_scope() as session:
        organization = await session.get(Organization, organization_id)
    if organization is None or organization.deleted_at is not None or organization.status != Status.running:
        return
    async with activity(organization_id, recovery=True):
        pass
    await hibernate(organization_id)
