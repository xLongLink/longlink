import pytest
import asyncio
import pytest_asyncio
import src.kubernetes.solutions
from uuid import UUID
from conftest import DatabaseKubernetes
from factories import claim_operation, create_solution, complete_operation, create_organization
from unittest.mock import ANY, AsyncMock
from sqlalchemy.orm import selectinload
from src.operations import solutions as runtime
from src.utils.jobs import execute
from src.environments import env
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import solutions
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation

pytestmark = pytest.mark.usefixtures("database_runtime")


@pytest.fixture
def rollout(monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    """Capture workload requests and control readiness only at the Kubernetes boundary."""

    # Replace only external workload readiness; keep worker and domain persistence real.
    workload_apply = AsyncMock(return_value=None)

    monkeypatch.setattr(runtime, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(src.kubernetes.solutions, "apply", workload_apply)
    return workload_apply


@pytest_asyncio.fixture
async def initial_deployment(users: tuple[User, User, User]) -> tuple[Solution, Operation]:
    """Commit a Solution and claim its initial deployment after Organization setup."""

    # Arrange the real creation and queue prerequisites without changing runtime credentials.
    organization = await create_organization(users[0])
    solution = await create_solution(
        organization,
        envs={"KEY": "old"},
        runtime_secrets={"LONGLINK_ENV": "production", "LONGLINK_IDENTITY_SECRET": "stable"},
    )
    setup = await claim_operation()
    assert setup is not None
    assert (setup.kind, setup.target_id) == (OperationKind.organization_create, organization.id)
    assert await complete_operation(setup.id) is not None
    initial = await claim_operation()
    assert initial is not None
    assert (initial.kind, initial.target_id) == (OperationKind.solution_deploy, solution.desired_revision_id)
    return solution, initial


@pytest_asyncio.fixture
async def pending_update(
    users: tuple[User, User, User], initial_deployment: tuple[Solution, Operation], rollout: AsyncMock
) -> tuple[Solution, UUID, Operation]:
    """Deploy the initial release, commit a different snapshot, and claim its update."""

    # Arrange a genuinely deployed fallback using the real worker and persistence.
    solution, initial = initial_deployment
    assert (await execute(initial)).failed is None

    # Replace only release configuration, leaving credentials and successful identity intact.
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"))
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, users[0].id)
        await solutions.deploy(session, current, users[0].id, metadata, {"KEY": "new"}, source=metadata.image, min_scale=1)
        await session.commit()
        desired_id = current.desired_revision_id

    # Claim only the committed update, not a fabricated deployment outcome.
    update = await claim_operation()
    assert update is not None
    assert (update.kind, update.target_id) == (OperationKind.solution_deploy, desired_id)
    return solution, initial.target_id, update


async def test_initial_deployment_failure_has_no_fallback(initial_deployment: tuple[Solution, Operation], rollout: AsyncMock) -> None:
    """Keep an initial deployment failed without scheduling a nonexistent fallback."""

    # Arrange
    solution, initial = initial_deployment
    rollout.side_effect = RuntimeError("rollout failed")

    # Act
    failed = await execute(initial)

    # Assert
    assert failed.failed == "RuntimeError: rollout failed"
    assert [request.kwargs["min_scale"] for request in rollout.await_args_list] == [0]
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.failed
        assert current.deployed_revision_id is None
        assert current.desired_revision_id == initial.target_id
        assert current.desired_revision.failed
        assert current.secrets == solution.secrets
    assert await claim_operation() is None


async def test_failed_update_restores_exact_previous_release(pending_update: tuple[Solution, UUID, Operation], rollout: AsyncMock) -> None:
    """Restore the last deployed snapshot while retaining the failed desired release."""

    # Arrange
    solution, good_id, update = pending_update
    rollout.side_effect = [RuntimeError("rollout failed"), None]

    # Act
    failed = await execute(update)

    # Assert failure is committed before any recovery is consumed.
    assert failed.failed == "RuntimeError: rollout failed"
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.failed
        assert current.desired_revision_id == update.target_id
        assert current.desired_revision.failed is True

    # Act on the exact fallback queued by the failed update.
    recovery = await claim_operation()
    assert recovery is not None
    assert (recovery.kind, recovery.target_id) == (OperationKind.solution_deploy, good_id)
    restored = await execute(recovery)

    # Assert the runtime receives the original snapshot without migration or credential changes.
    assert restored.failed is None
    assert [request.kwargs["min_scale"] for request in rollout.await_args_list] == [0, 1, 0]
    rollout.assert_awaited_with(
        ANY,
        solution.organization_id,
        solution.id,
        "ghcr.io/longlink/dashboard@sha256:test",
        {
            "KEY": "old",
            **solution.secrets,
            "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca",
            "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
        },
        revision_id=good_id,
        min_scale=0,
        idle_seconds=60,
        migrate=False,
        registry_connection_id=None,
    )
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.running
        assert current.desired_revision_id == update.target_id
        assert current.deployed_revision_id == good_id
        assert current.desired_revision.failed
        assert current.secrets == solution.secrets
        good = await session.get(Revision, good_id)
        assert good is not None
        assert not good.failed
    assert await claim_operation() is None


async def test_timed_out_update_finalizes_and_persists_failure_before_recovery(
    pending_update: tuple[Solution, UUID, Operation], rollout: AsyncMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Cancel the stalled rollout and commit its exact timeout before restoring the fallback."""

    # Arrange
    solution, good_id, update = pending_update
    rollout_finalized = asyncio.Event()

    async def stalled_rollout(*_args: object, **_kwargs: object) -> None:
        """Stay pending until the real worker timeout cancels and finalizes the rollout."""

        try:
            await asyncio.Event().wait()
        finally:
            rollout_finalized.set()

    rollout.side_effect = stalled_rollout

    # Act with the timeout override limited to this failing attempt, not recovery work.
    with monkeypatch.context() as timeout:
        timeout.setattr(env, "OPERATION_TIMEOUT_SECONDS", 0.5)
        async with asyncio.timeout(3):
            failed = await execute(update)

    # Assert finalization and committed failure both precede worker return.
    assert rollout_finalized.is_set()
    assert failed.failed == "Operation timed out after 0.5 seconds"
    async with session_scope() as session:
        persisted = await session.get(Operation, update.id)
        assert persisted is not None
        assert persisted.failed == "Operation timed out after 0.5 seconds"
        assert persisted.finished_at is not None
        assert persisted.lease_expires_at is None
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.failed
        assert current.desired_revision_id == update.target_id
        assert current.desired_revision.failed is True

    # Act on the persisted fallback using ordinary readiness, not the timeout seam.
    rollout.side_effect = None
    recovery = await claim_operation()
    assert recovery is not None
    assert (recovery.kind, recovery.target_id) == (OperationKind.solution_deploy, good_id)
    restored = await execute(recovery)

    # Assert recovery still honors the exact original snapshot and preserves failed history.
    assert restored.failed is None
    assert [request.kwargs["min_scale"] for request in rollout.await_args_list] == [0, 1, 0]
    rollout.assert_awaited_with(
        ANY,
        solution.organization_id,
        solution.id,
        "ghcr.io/longlink/dashboard@sha256:test",
        {
            "KEY": "old",
            **solution.secrets,
            "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca",
            "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
        },
        revision_id=good_id,
        min_scale=0,
        idle_seconds=60,
        migrate=False,
        registry_connection_id=None,
    )
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.running
        assert current.desired_revision_id == update.target_id
        assert current.deployed_revision_id == good_id
        assert current.desired_revision.failed
        assert current.secrets == solution.secrets
        good = await session.get(Revision, good_id)
        assert good is not None
        assert not good.failed
    assert await claim_operation() is None


async def test_failed_restoration_cannot_publish_running_or_schedule_recovery(
    pending_update: tuple[Solution, UUID, Operation], rollout: AsyncMock
) -> None:
    """Leave failed restoration terminal without damaging the successful revision or retrying recursively."""

    # Arrange
    solution, good_id, update = pending_update
    rollout.side_effect = RuntimeError("rollout failed")

    # Act
    failed = await execute(update)

    # Assert failure is committed before restoration starts.
    assert failed.failed == "RuntimeError: rollout failed"
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.failed
        assert current.desired_revision_id == update.target_id
        assert current.desired_revision.failed is True

    # Act with the same external failure during restoration.
    recovery = await claim_operation()
    assert recovery is not None
    assert (recovery.kind, recovery.target_id) == (OperationKind.solution_deploy, good_id)
    restored = await execute(recovery)

    # Assert even a failed restoration uses the exact fallback without migration.
    assert restored.failed == "RuntimeError: rollout failed"
    assert [request.kwargs["min_scale"] for request in rollout.await_args_list] == [0, 1, 0]
    rollout.assert_awaited_with(
        ANY,
        solution.organization_id,
        solution.id,
        "ghcr.io/longlink/dashboard@sha256:test",
        {
            "KEY": "old",
            **solution.secrets,
            "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca",
            "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
        },
        revision_id=good_id,
        min_scale=0,
        idle_seconds=60,
        migrate=False,
        registry_connection_id=None,
    )
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.failed
        assert current.desired_revision_id == update.target_id
        assert current.deployed_revision_id == good_id
        assert current.desired_revision.failed
        assert current.secrets == solution.secrets
        good = await session.get(Revision, good_id)
        assert good is not None
        assert not good.failed
    assert await claim_operation() is None


async def test_shutdown_releases_same_update_without_failure(pending_update: tuple[Solution, UUID, Operation], rollout: AsyncMock) -> None:
    """Make an interrupted update claimable again without failing its revision."""

    # Arrange
    solution, good_id, update = pending_update
    rollout.side_effect = asyncio.CancelledError()

    # Act
    with pytest.raises(asyncio.CancelledError):
        await execute(update)

    # Assert shutdown commits only a lease release before another worker claims the same work.
    assert [request.kwargs["min_scale"] for request in rollout.await_args_list] == [0, 1]
    async with session_scope() as session:
        persisted = await session.get(Operation, update.id)
        assert persisted is not None
        assert persisted.failed is None
        assert persisted.finished_at is None
        assert persisted.lease_expires_at is None
        revision = await session.get(Revision, update.target_id)
        assert revision is not None
        assert not revision.failed
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.deployed_revision_id == good_id
        assert current.desired_revision_id == update.target_id
        assert current.secrets == solution.secrets
    resumed = await claim_operation()
    assert resumed is not None
    assert resumed.id == update.id
    assert resumed.target_id == update.target_id
    assert resumed.failed is None
    assert resumed.finished_at is None


async def test_tombstone_during_failed_rollout_suppresses_new_recovery(
    users: tuple[User, User, User], pending_update: tuple[Solution, UUID, Operation], rollout: AsyncMock
) -> None:
    """Retain deletion work instead of requesting recovery after a tombstoned rollout fails."""

    # Arrange
    solution, good_id, update = pending_update

    async def deleted_rollout(*_args: object, **_kwargs: object) -> None:
        """Commit deletion while readiness is pending, then fail the external rollout."""

        async with session_scope() as session:
            await solutions.delete(session, solution.id, users[0].id)
            await session.commit()
        raise RuntimeError("rollout failed")

    rollout.side_effect = deleted_rollout

    # Act
    failed = await execute(update)

    # Assert no new recovery can displace or consume the deletion request.
    assert failed.failed == "RuntimeError: rollout failed"
    deletion = await claim_operation()
    assert deletion is not None
    assert (deletion.kind, deletion.target_id) == (OperationKind.solution_delete, solution.id)
    assert await complete_operation(deletion.id) is not None
    assert await claim_operation() is None
    assert [request.kwargs["min_scale"] for request in rollout.await_args_list] == [0, 1]
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.deleted_at is not None
        assert current.deployed_revision_id == good_id
        assert current.desired_revision_id == update.target_id
        assert current.desired_revision.failed
        assert current.secrets == solution.secrets


async def test_tombstone_before_recovery_suppresses_existing_rollout(
    users: tuple[User, User, User], pending_update: tuple[Solution, UUID, Operation], rollout: AsyncMock
) -> None:
    """Skip already queued recovery after deletion without losing the tombstone or cleanup request."""

    # Arrange a failed update with a committed recovery request before deletion.
    solution, good_id, update = pending_update
    rollout.side_effect = RuntimeError("rollout failed")
    failed = await execute(update)
    assert failed.failed == "RuntimeError: rollout failed"
    async with session_scope() as session:
        await solutions.delete(session, solution.id, users[0].id)
        await session.commit()
    recovery = await claim_operation()
    assert recovery is not None
    assert (recovery.kind, recovery.target_id) == (OperationKind.solution_deploy, good_id)

    # Act
    skipped = await execute(recovery)

    # Assert recovery succeeds without touching Kubernetes, while deletion remains queued.
    assert skipped.failed is None
    deletion = await claim_operation()
    assert deletion is not None
    assert (deletion.kind, deletion.target_id) == (OperationKind.solution_delete, solution.id)
    assert await complete_operation(deletion.id) is not None
    assert await claim_operation() is None
    assert [request.kwargs["min_scale"] for request in rollout.await_args_list] == [0, 1]
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.deleted_at is not None
        assert current.deployed_revision_id == good_id
        assert current.desired_revision_id == update.target_id
        assert current.desired_revision.failed
        assert current.secrets == solution.secrets


async def test_queued_deployments_keep_exact_targets(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """A newer desired revision cannot change the image or envs of queued work."""

    organization = await create_organization(users[0])
    solution = await create_solution(
        organization,
        envs={"KEY": "first"},
        runtime_secrets={"LONGLINK_ENV": "production", "LONGLINK_IDENTITY_SECRET": "stable"},
    )
    setup = await claim_operation()
    assert setup is not None
    await complete_operation(setup.id)
    initial = await claim_operation()
    assert initial is not None
    second = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:second"))
    third = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:third"))
    second_id: UUID | None = None
    third_id: UUID | None = None
    applied: list[str] = []
    expected_images = {
        "first": "ghcr.io/longlink/dashboard@sha256:test",
        "second": "ghcr.io/longlink/dashboard@sha256:second",
        "third": "ghcr.io/longlink/dashboard@sha256:third",
    }

    async def apply(
        client: object,
        _organization_id: UUID,
        _id: UUID,
        image: str,
        secrets: dict[str, str],
        *,
        revision_id: UUID,
        min_scale: int,
        idle_seconds: int = 60,
        migrate: bool,
        registry_connection_id: UUID | None = None,
    ) -> None:
        """Capture immutable image and environment pairs."""

        nonlocal second_id, third_id
        applied.append(secrets["KEY"])
        assert image == expected_images[secrets["KEY"]]
        assert revision_id == {"first": initial.target_id, "second": second_id, "third": third_id}[secrets["KEY"]]
        if second_id is None:
            # A newer request during an active rollout must not change its captured target.
            async with session_scope() as session:
                current = await solutions.access(session, solution.id, users[0].id)
                await solutions.deploy(session, current, users[0].id, second, {"KEY": "second"}, source=second.image)
                await session.commit()
                second_id = current.desired_revision_id
        elif third_id is None:
            # The second rollout still uses its snapshot while a third revision becomes desired.
            async with session_scope() as session:
                current = await solutions.access(session, solution.id, users[0].id)
                await solutions.deploy(session, current, users[0].id, third, {"KEY": "third"}, source=third.image)
                await session.commit()
                third_id = current.desired_revision_id

    monkeypatch.setattr(runtime, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(src.kubernetes.solutions, "apply", apply)
    await execute(initial)
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.deployed_revision_id == initial.target_id
        assert current.desired_revision_id == second_id
    second_operation = await claim_operation()
    assert second_operation is not None
    assert second_operation.target_id == second_id
    assert (await execute(second_operation)).failed is None
    third_operation = await claim_operation()
    assert third_operation is not None
    assert third_operation.target_id == third_id
    assert (await execute(third_operation)).failed is None
    assert applied == ["first", "second", "third"]
    assert await claim_operation() is None
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision_id == current.deployed_revision_id == third_id
