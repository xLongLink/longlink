import pytest
import asyncio
from uuid import UUID, uuid4
from types import SimpleNamespace
from conftest import DatabasePostgres
from datetime import UTC, datetime, timedelta
from factories import create_organization
from src.operations import databases
from src.database.session import session_scope
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
async def test_ready_interrupts_provisioning_without_releasing_replacement_lease(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Cancel stale provisioning without publishing or altering a successor's state."""

    # Arrange
    organization = await create_organization(users[0])
    started = asyncio.Event()
    interrupted = asyncio.Event()
    renew = asyncio.Event()

    class Database(DatabasePostgres):
        async def prepare_organization_database(self, organization: UUID) -> None:
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

    # Act
    provisioning = asyncio.create_task(databases.ready(organization.id))
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
async def test_ready_cancellation_releases_owned_lease_and_allows_retry(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Release an interrupted owner's activity and allow real provisioning to retry."""

    # Arrange
    organization = await create_organization(users[0])
    started = asyncio.Event()
    interrupted = asyncio.Event()

    class Database(DatabasePostgres):
        async def prepare_organization_database(self, organization: UUID) -> None:
            """Suspend external SQL until worker shutdown interrupts provisioning."""

            started.set()
            try:
                await asyncio.Event().wait()
            finally:
                interrupted.set()

    # Act with a scoped external-I/O seam so the retry uses the normal local transport.
    with monkeypatch.context() as provider:
        provider.setattr(databases.database_resources.postgres, "Postgres", Database)
        provisioning = asyncio.create_task(databases.ready(organization.id))
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
        assert await databases.ready(organization.id) is True
    async with session_scope() as session:
        assert await session.get(OrganizationActivity, organization.id) is None
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_state == DatabaseState.available
