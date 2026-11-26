import pytest
import asyncio
from uuid import UUID, uuid4
from types import SimpleNamespace
from conftest import DatabasePostgres, reject_provider_construction
from datetime import UTC, datetime, timedelta
from factories import create_organization
from src.operations import databases
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.models.organizations import DatabaseState
from src.database.models.users import User
from src.database.models.organizations import Organization, OrganizationActivity

LEASE_OWNERSHIP_CASES = [
    pytest.param(180, 0, True, id="matching-unexpired-row"),
    pytest.param(300, -120, False, id="replacement-expiry"),
    pytest.param(-1, 0, False, id="expired-row"),
]


@pytest.mark.parametrize(("expiry_seconds", "lease_offset_seconds", "expected"), LEASE_OWNERSHIP_CASES)
async def test_owned_requires_matching_unexpired_row(
    users: tuple[User, User, User], expiry_seconds: int, lease_offset_seconds: int, expected: bool
) -> None:
    """Require a matching, unexpired persisted lease before accepting ownership."""

    # Arrange
    organization = await create_organization(users[0], name="owned")
    persisted_expires_at = datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=expiry_seconds)
    activity = OrganizationActivity(organization_id=organization.id, expires_at=persisted_expires_at)

    # Commit the activity before checking ownership in a separate session.
    async with session_scope() as session:
        session.add(activity)
        await session.commit()
    lease = databases.Lease(organization_id=organization.id, expires_at=activity.expires_at + timedelta(seconds=lease_offset_seconds))

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is expected


async def test_owned_rejects_missing_row() -> None:
    """Deny ownership after crash recovery deletes the activity."""

    # Arrange
    lease = databases.Lease(organization_id=uuid4(), expires_at=datetime.now(UTC) + timedelta(seconds=180))

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is False


@pytest.mark.usefixtures("database_runtime")
@pytest.mark.parametrize("status", [Status.creating, Status.running])
async def test_prepare_verifies_readiness_before_opening_postgres(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, status: Status
) -> None:
    """Require ready infrastructure before SQL access on both provisioning paths."""

    # Arrange
    organization = await create_organization(users[0])
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.status = status
        await session.commit()
        target = await organizations.infrastructure(session, organization.id)
        assert target is not None
        snapshot, compute = target
    cluster = databases.Kubernetes(compute.kubeconfig)
    verified = False

    async def wait_ready(_client: object, _organization: UUID) -> None:
        """Complete the external readiness check before SQL construction."""

        nonlocal verified
        verified = True

    class Database(DatabasePostgres):
        def __init__(self, *args: object, **kwargs: object) -> None:
            """Reject SQL access before infrastructure readiness."""

            assert verified
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(databases.database_resources, "wait_ready", wait_ready)
    monkeypatch.setattr(databases.database_resources.postgres, "Postgres", Database)

    # Act
    async with databases.reconciling(organization.id) as lease:
        assert lease is not None
        await databases.prepare(lease, snapshot, cluster, compute.database_storage_class)

    # Assert
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_state == DatabaseState.available


@pytest.mark.usefixtures("database_runtime")
@pytest.mark.parametrize("ready", [True, False], ids=["ready", "unready"])
async def test_prepare_available_database_checks_readiness_without_reinitializing(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, ready: bool
) -> None:
    """Own existing database readiness without rewriting its published availability."""

    # Arrange
    organization = await create_organization(users[0])
    async with session_scope() as session:
        current = await session.get(Organization, organization.id)
        assert current is not None
        current.database_state = DatabaseState.available
        await session.commit()
        target = await organizations.infrastructure(session, organization.id)
        assert target is not None
        snapshot, compute = target
    cluster = databases.Kubernetes(compute.kubeconfig)
    verified = False

    async def wait_ready(client: object, organization_id: UUID) -> None:
        """Check the captured infrastructure without opening SQL."""

        nonlocal verified
        assert client is cluster
        assert organization_id == organization.id
        verified = True
        if not ready:
            raise RuntimeError("database is unready")

    monkeypatch.setattr(databases.database_resources, "wait_ready", wait_ready)
    reject_provider_construction(monkeypatch, (databases.database_resources, "apply"), (databases.database_resources.postgres, "Postgres"))

    # Act
    async with databases.reconciling(organization.id) as lease:
        assert lease is not None
        if ready:
            await databases.prepare(lease, snapshot, cluster, compute.database_storage_class)
        else:
            with pytest.raises(RuntimeError, match="database is unready"):
                await databases.prepare(lease, snapshot, cluster, compute.database_storage_class)

    # Assert
    assert verified
    async with session_scope() as session:
        current = await session.get(Organization, organization.id)
        assert current is not None
        assert current.database_state == DatabaseState.available
        assert await session.get(OrganizationActivity, organization.id) is None


@pytest.mark.usefixtures("database_runtime")
async def test_prepare_interrupts_provisioning_without_releasing_replacement_lease(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Cancel stale provisioning without publishing or altering a successor's state."""

    # Arrange
    organization = await create_organization(users[0])
    async with session_scope() as session:
        target = await organizations.infrastructure(session, organization.id)
        assert target is not None
        snapshot, compute = target
    cluster = databases.Kubernetes(compute.kubeconfig)
    started = asyncio.Event()
    interrupted = asyncio.Event()
    renew = asyncio.Event()

    class Database(DatabasePostgres):
        async def prepare_organization_database(self, _organization: UUID) -> None:
            """Hold external SQL provisioning until lease loss interrupts it."""

            started.set()
            try:
                await asyncio.Event().wait()
            finally:
                interrupted.set()

    async def renewal_tick(delay: float) -> None:
        """Permit renewal only after the replacement lease has committed."""

        assert delay == 30
        await renew.wait()

    # Replace only external SQL and this module's timer; keep lease persistence real.
    monkeypatch.setattr(databases.database_resources.postgres, "Postgres", Database)
    monkeypatch.setattr(databases, "asyncio", SimpleNamespace(**(vars(asyncio) | {"sleep": renewal_tick})))

    async def prepare() -> None:
        """Run preparation under the same maintained lease as reconciliation."""

        async with databases.reconciling(organization.id) as lease:
            assert lease is not None
            await databases.prepare(lease, snapshot, cluster, compute.database_storage_class)

    # Act
    provisioning = asyncio.create_task(prepare())
    try:
        async with asyncio.timeout(5):
            await started.wait()

            # Inspect the real activity lease while its owner is still running.
            async with session_scope() as session:
                activity = await session.get(OrganizationActivity, organization.id)
                assert activity is not None
                replacement_expiry = activity.expires_at + timedelta(minutes=5)
                activity.expires_at = replacement_expiry
                await session.commit()
            renew.set()

            # Assert renewal, not the test, interrupts the owner and finalizes provisioning.
            with pytest.raises(RuntimeError, match="Organization activity lease was lost"):
                await provisioning
        assert interrupted.is_set()
    finally:
        # Reap the owner even if renewal or lease cleanup stops making progress.
        provisioning.cancel()
        async with asyncio.timeout(3):
            await asyncio.gather(provisioning, return_exceptions=True)

    # Verify conditional cleanup preserved the committed successor and unpublished state.
    async with session_scope() as session:
        activity = await session.get(OrganizationActivity, organization.id)
        assert activity is not None
        assert activity.expires_at == replacement_expiry
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_state == organization.database_state
        assert persisted.database_state != DatabaseState.available


@pytest.mark.usefixtures("database_runtime")
async def test_prepare_cancellation_releases_owned_lease_and_allows_retry(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Release an interrupted owner's activity and allow real provisioning to retry."""

    # Arrange
    organization = await create_organization(users[0])
    async with session_scope() as session:
        target = await organizations.infrastructure(session, organization.id)
        assert target is not None
        snapshot, compute = target
    cluster = databases.Kubernetes(compute.kubeconfig)
    started = asyncio.Event()
    interrupted = asyncio.Event()

    class Database(DatabasePostgres):
        async def prepare_organization_database(self, _organization: UUID) -> None:
            """Suspend external SQL until worker shutdown interrupts provisioning."""

            started.set()
            try:
                await asyncio.Event().wait()
            finally:
                interrupted.set()

    async def prepare() -> None:
        """Run preparation under the same maintained lease as reconciliation."""

        async with databases.reconciling(organization.id) as lease:
            assert lease is not None
            await databases.prepare(lease, snapshot, cluster, compute.database_storage_class)

    # Act with a scoped external-I/O seam so the retry uses the normal local transport.
    with monkeypatch.context() as provider:
        provider.setattr(databases.database_resources.postgres, "Postgres", Database)
        provisioning = asyncio.create_task(prepare())
        try:
            await asyncio.wait_for(started.wait(), timeout=5)
            provisioning.cancel()

            # Assert worker cancellation independently of the diagnostic timeout.
            with pytest.raises(asyncio.CancelledError):
                await asyncio.wait_for(asyncio.shield(provisioning), timeout=5)
            assert interrupted.is_set()
        finally:
            # Always await cancellation and its real lease-release transaction.
            provisioning.cancel()
            async with asyncio.timeout(3):
                await asyncio.gather(provisioning, return_exceptions=True)

    # Verify committed retryable state and absence of the released activity.
    async with session_scope() as session:
        assert await session.get(OrganizationActivity, organization.id) is None
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_state == DatabaseState.failed

    # Retry the real lifecycle and inspect publication from another session.
    async with asyncio.timeout(5):
        await prepare()
    async with session_scope() as session:
        assert await session.get(OrganizationActivity, organization.id) is None
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_state == DatabaseState.available
