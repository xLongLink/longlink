import pytest
import asyncio
from uuid import UUID
from conftest import AsyncKubernetes, DatabaseKubernetes
from factories import claim_operation, create_solution, complete_operation, create_organization
from src.operations import solutions as runtime
from src.utils.jobs import execute
from src.environments import env
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import solutions, operations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation

pytestmark = pytest.mark.usefixtures("database_runtime")


@pytest.mark.parametrize(
    "failure", ["initial", "error", "timeout", "shutdown", "restoration", "deleted_during_rollout", "deleted_before_recovery"]
)
async def test_failed_update_recovery(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, failure: str) -> None:
    """Finalize timed-out rollouts before returning, recover failures, and resume shutdown."""

    # Arrange: use real persisted revisions and the actual worker; replace only Kubernetes.
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(
        organization, secrets={"KEY": "old", "LONGLINK_ENV": "production", "LONGLINK_IDENTITY_SECRET": "stable"}
    )
    setup = await claim_operation()
    assert setup is not None
    await complete_operation(setup.id)
    calls: list[tuple[str, dict[str, str], bool]] = []
    rollout_finalized = asyncio.Event()
    failing = failure == "initial"

    class Kubernetes(AsyncKubernetes):
        """Control rollout readiness at the external-system boundary."""

        def __init__(self, *_args: object) -> None:
            """Expose the runtime adapter."""

            self.solutions = self
            self.databases = DatabaseKubernetes()
            self.storage = self.databases.storage

        async def apply(
            self,
            _organization_id: UUID,
            _id: UUID,
            image: str,
            secrets: dict[str, str],
            *,
            revision_id: UUID,
            min_scale: int,
            migrate: bool,
        ) -> None:
            """Capture the exact snapshot and simulate rollout outcomes."""

            calls.append((image, secrets, migrate))
            assert min_scale == (1 if image.endswith("@sha256:new") else 0)
            if not failing:
                return
            if failure == "deleted_during_rollout":
                async with session_scope() as session:
                    await solutions.delete(session, solution.id, owner.id)
                    await session.commit()
            if not migrate and failure != "restoration":
                return
            if failure == "shutdown":
                raise asyncio.CancelledError
            if failure == "timeout":
                # Suspend rollout until the real worker timeout cancels and finalizes it.
                try:
                    await asyncio.Event().wait()
                finally:
                    rollout_finalized.set()
            raise RuntimeError("rollout failed")

        async def aclose(self) -> None:
            """Close the adapter without external resources."""

    monkeypatch.setattr(runtime, "Kubernetes", Kubernetes)
    initial = await claim_operation()
    assert initial is not None
    result = await execute(initial)
    if failure == "initial":
        assert result.failed is not None
        async with session_scope() as session:
            current = await session.get(Solution, solution.id)
            assert current is not None and current.status == Status.failed
            assert current.deployed_revision_id is None
            assert current.desired_revision.failed
            await operations.schedule_reconciliation(session)
            await session.commit()
        while (scheduled := await claim_operation()) is not None:
            assert scheduled.kind != OperationKind.solution_deploy
            await complete_operation(scheduled.id)
        return
    assert result.failed is None
    good_id = initial.target_id

    # Replace only release configuration, leaving credentials and successful identity intact.
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"))
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, owner.id)
        await solutions.deploy(session, current, owner.id, metadata, {"KEY": "new"}, min_scale=1)
        await session.commit()
        desired_id = current.desired_revision_id
    failing = True
    update = await claim_operation()
    assert update is not None and update.target_id == desired_id

    # Shutdown is resumable, not a failed deployment or recovery request.
    if failure == "shutdown":
        with pytest.raises(asyncio.CancelledError):
            await execute(update)
        resumed = await claim_operation()
        assert resumed is not None and resumed.id == update.id
        async with session_scope() as session:
            revision = await session.get(Revision, desired_id)
            assert revision is not None and not revision.failed
        return

    # Act: limit the timeout override to the failing attempt, not recovery work.
    with monkeypatch.context() as timeout:
        if failure == "timeout":
            timeout.setattr(env, "OPERATION_TIMEOUT_SECONDS", 0.5)
        failed = await execute(update)

    # Assert: rollout finalization and the exact persisted timeout precede worker return.
    assert failed.failed is not None
    if failure == "timeout":
        assert rollout_finalized.is_set()
        assert failed.failed == "Operation timed out after 0.5 seconds"
        async with session_scope() as session:
            persisted = await session.get(Operation, update.id)
            assert persisted is not None
            assert persisted.failed == "Operation timed out after 0.5 seconds"

    # Tombstones suppress both new recovery requests and already queued recovery work.
    if failure in {"deleted_during_rollout", "deleted_before_recovery"}:
        if failure == "deleted_before_recovery":
            async with session_scope() as session:
                await solutions.delete(session, solution.id, owner.id)
                await session.commit()
            recovery = await claim_operation()
            assert recovery is not None and recovery.kind == OperationKind.solution_deploy
            assert (await execute(recovery)).failed is None
        deletion = await claim_operation()
        assert deletion is not None and deletion.kind == OperationKind.solution_delete
        await complete_operation(deletion.id)
        assert await claim_operation() is None
        assert len(calls) == 2
        async with session_scope() as session:
            current = await session.get(Solution, solution.id)
            assert current is not None and current.deleted_at is not None
            assert current.deployed_revision_id == good_id
            assert current.desired_revision_id == desired_id
            assert current.desired_revision.failed
        return

    recovery = await claim_operation()
    assert recovery is not None
    assert (recovery.kind, recovery.target_id) == (OperationKind.solution_deploy, good_id)
    restored = await execute(recovery)
    assert (restored.failed is not None) == (failure == "restoration")

    # Failed desired/history survives successful fallback; failed fallback cannot claim running.
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision_id == desired_id
        assert current.deployed_revision_id == good_id
        assert current.desired_revision.failed
        good = await session.get(Revision, good_id)
        assert good is not None and not good.failed
        assert current.status == (Status.failed if failure == "restoration" else Status.running)
        assert current.secrets == solution.secrets
    assert calls[-1][1] == {"KEY": "old", **solution.secrets, "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca"}
    assert calls[-1][2] is False
    assert await claim_operation() is None

    # Reconciliation repairs last-known-good, never endlessly retries failed desired.
    async with session_scope() as session:
        await operations.schedule_reconciliation(session)
        await session.commit()
    while (scheduled := await claim_operation()) is not None:
        assert not (scheduled.kind == OperationKind.solution_deploy and scheduled.target_id == desired_id)
        await complete_operation(scheduled.id)


async def test_queued_deployments_keep_exact_targets(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """A newer desired revision cannot change the image or envs of queued work."""

    organization = await create_organization(users[0])
    solution = await create_solution(
        organization, secrets={"KEY": "first", "LONGLINK_ENV": "production", "LONGLINK_IDENTITY_SECRET": "stable"}
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

    class Kubernetes(AsyncKubernetes):
        """Capture which queued snapshot reaches the runtime."""

        def __init__(self, *_args: object) -> None:
            """Expose runtime deployment."""

            self.solutions = self
            self.databases = DatabaseKubernetes()
            self.storage = self.databases.storage

        async def apply(
            self,
            _organization_id: UUID,
            _id: UUID,
            image: str,
            secrets: dict[str, str],
            *,
            revision_id: UUID,
            min_scale: int,
            migrate: bool,
        ) -> None:
            """Capture immutable image and environment pairs."""

            nonlocal second_id, third_id
            applied.append(secrets["KEY"])
            assert image == expected_images[secrets["KEY"]]
            if second_id is None:
                # A newer request during an active rollout must not change its captured target.
                async with session_scope() as session:
                    current = await solutions.access(session, solution.id, users[0].id)
                    await solutions.deploy(session, current, users[0].id, second, {"KEY": "second"})
                    await session.commit()
                    second_id = current.desired_revision_id
            elif third_id is None:
                # The second rollout still uses its snapshot while a third revision becomes desired.
                async with session_scope() as session:
                    current = await solutions.access(session, solution.id, users[0].id)
                    await solutions.deploy(session, current, users[0].id, third, {"KEY": "third"})
                    await session.commit()
                    third_id = current.desired_revision_id

        async def aclose(self) -> None:
            """Close the adapter."""

    monkeypatch.setattr(runtime, "Kubernetes", Kubernetes)
    await execute(initial)
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.deployed_revision_id == initial.target_id
        assert current.desired_revision_id == second_id
    second_operation = await claim_operation()
    assert second_operation is not None and second_operation.target_id == second_id
    assert (await execute(second_operation)).failed is None
    third_operation = await claim_operation()
    assert third_operation is not None and third_operation.target_id == third_id
    assert (await execute(third_operation)).failed is None
    assert applied == ["first", "second", "third"]
    assert await claim_operation() is None
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision_id == current.deployed_revision_id == third_id
