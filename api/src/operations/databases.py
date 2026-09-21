import asyncio
import contextlib
from uuid import UUID
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from src.utils import postgres
from sqlalchemy import text, delete, select, update
from dataclasses import field, dataclass
from src.kubernetes import namespace
from collections.abc import Iterator, AsyncIterator
from src.models.types import DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import DatabaseState
from src.database.models.organizations import Organization, OrganizationActivity

LEASE_SECONDS = 180
RENEW_SECONDS = 30


async def lock(session: AsyncSession, organization_id: UUID) -> Organization | None:
    """Serialize admission and transitions on SQLite, PostgreSQL, and MySQL."""

    # An UPDATE takes a write lock even where SELECT FOR UPDATE is unsupported.
    await session.execute(
        update(Organization).where(col(Organization.id) == organization_id).values(updated_at=col(Organization.updated_at))
    )
    return await session.get(Organization, organization_id, populate_existing=True)


async def connection(organization: Organization, cluster: Kubernetes) -> postgres.Postgres:
    """Build the Organization's private, CA-verified PostgreSQL connection."""

    # Platform workers can run outside the compute cluster and its private DNS/network.
    port = await cluster.forward_database(organization.id)

    # Preserve the cluster DNS hostname for certificate verification even through a local tunnel.
    certificate = await cluster.databases.certificate(organization.id)
    return postgres.Postgres(
        host=namespace.database_hostname(organization.id),
        port=port,
        username="postgres",
        password=organization.database_password,
        sslmode=DatabaseSSLMode.require,
        certificate=certificate,
        hostaddr="127.0.0.1",
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
        if self.lost or self.expires_at <= datetime.now(UTC):
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
        return row is not None and row.expires_at == self.expires_at and row.expires_at > datetime.now(UTC)

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
                        expires_at = datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=LEASE_SECONDS)
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
                    await session.commit()


async def _claim(session: AsyncSession, organization_id: UUID, *, transition: bool = False) -> Lease | None:
    """Insert an activity after the caller has locked its Organization."""

    # The Organization UUID reserves one lease slot for exclusive database transitions.
    now = datetime.now(UTC)
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
                    col(OrganizationActivity.expires_at) > datetime.now(UTC),
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
    """Provision the database and shared projection behind one persisted transition lease."""

    while True:
        # Provisioning decisions share the same short write transaction.
        async with session_scope() as session:
            organization = await lock(session, organization_id)
            if organization is None or organization.deleted_at is not None:
                raise RuntimeError("Organization is unavailable")
            transition = await session.get(OrganizationActivity, organization_id)
            if organization.database_state == DatabaseState.available and (
                transition is None or transition.expires_at <= datetime.now(UTC)
            ):
                return
            lease = await _claim(session, organization_id, transition=True)
            await session.commit()
        if lease is None:
            await asyncio.sleep(0.5)
            continue

        async with lease.maintain():
            try:
                async with session_scope() as session:
                    target = await organizations.infrastructure(session, organization_id)
                if target is None:
                    raise RuntimeError("Organization is unavailable")
                organization, compute = target
                cluster = Kubernetes(compute.kubeconfig)
                async with cluster:
                    await lease.check()
                    if organization.status != Status.running:
                        await cluster.databases.apply(
                            organization_id,
                            organization.database_password,
                            compute.database_storage_class,
                            size_mib=organization.database_size_mib,
                            instances=organization.database_instances,
                        )
                    else:
                        # Reassert the desired annotation even after an expired worker's interrupted sleep.
                        await cluster.databases.resume(organization_id)
                    database = await connection(organization, cluster)
                    if organization.status != Status.running:
                        await lease.check()
                        await database.prepare_organization_database(organization_id)

                    while True:
                        # Verify ownership before taking the snapshot; the publish gate rechecks shared state.
                        async with session_scope() as session:
                            organization = await lock(session, organization_id)
                            if organization is None or organization.deleted_at is not None or not await lease.owned(session):
                                raise RuntimeError("Organization transition lease was lost")
                            await session.commit()
                        await lease.check()
                        async with session_scope() as session:
                            await organizations.project_users(session, organization_id, database)

                        # Empty snapshots skip SQL; verify the tenant connection immediately before publication.
                        async with asyncio.timeout(10), database.connection(organization_id.hex) as sql:
                            await sql.execute(text("SELECT 1"))

                        # Publish the provisioned database and its shared projection.
                        async with session_scope() as session:
                            organization = await lock(session, organization_id)
                            if organization is None or organization.deleted_at is not None or not await lease.owned(session):
                                raise RuntimeError("Organization transition lease was lost")
                            organization.database_state = DatabaseState.available
                            await session.commit()
                            return
            except BaseException:
                # An interrupted snapshot is retried through the failed state.
                async with session_scope() as session:
                    organization = await lock(session, organization_id)
                    if organization is not None and await lease.owned(session):
                        organization.database_state = DatabaseState.failed
                    await session.commit()
                raise
