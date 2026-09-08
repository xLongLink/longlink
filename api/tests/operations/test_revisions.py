import pytest
import asyncio
from uuid import UUID
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


@pytest.mark.parametrize(
    "failure", ["initial", "error", "timeout", "shutdown", "restoration", "deleted_during_rollout", "deleted_before_recovery"]
)
async def test_failed_update_recovery(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, failure: str) -> None:
    """Recover errors and timeouts durably, but release shutdown for resumption."""

    # Use real persisted revisions and the actual worker; replace only Kubernetes.
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(
        organization, secrets={"KEY": "old", "LONGLINK_ENV": "production", "LONGLINK_IDENTITY_SECRET": "stable"}
    )
    setup = await claim_operation()
    assert setup is not None
    await complete_operation(setup.id)
    calls: list[tuple[str, dict[str, str], bool]] = []
    failing = failure == "initial"

    class Kubernetes:
        """Control rollout readiness at the external-system boundary."""

        def __init__(self, *_args: object) -> None:
            """Expose the runtime adapter."""

            self.solutions = self

        async def apply(self, _id: UUID, _namespace: str, image: str, secrets: dict[str, str], *, revision_id: UUID, migrate: bool) -> None:
            """Capture the exact snapshot and simulate rollout outcomes."""

            calls.append((image, secrets, migrate))
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
                await asyncio.sleep(10)
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
        await solutions.deploy(session, current, owner.id, metadata, {"KEY": "new"})
        await session.commit()
        desired_id = current.desired_revision_id
    failing = True
    if failure == "timeout":
        monkeypatch.setattr(env, "OPERATION_TIMEOUT_SECONDS", 0.01)
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

    failed = await execute(update)
    assert failed.failed is not None
    if failure == "timeout":
        assert "timed out" in failed.failed

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
    monkeypatch.setattr(env, "OPERATION_TIMEOUT_SECONDS", 600)
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
    assert calls[-1][1] == {"KEY": "old", **solution.secrets}
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
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:second"))
    latest_id: UUID | None = None
    return_to_active = False
    applied: list[str] = []

    class Kubernetes:
        """Capture which queued snapshot reaches the runtime."""

        def __init__(self, *_args: object) -> None:
            """Expose runtime deployment."""

            self.solutions = self

        async def apply(self, _id: UUID, _namespace: str, image: str, secrets: dict[str, str], *, revision_id: UUID, migrate: bool) -> None:
            """Capture immutable image and environment pairs."""

            nonlocal latest_id
            applied.append(secrets["KEY"])
            assert image.endswith("test" if secrets["KEY"] == "first" else "second")
            if latest_id is None:
                # A newer request during an active rollout must not change its captured target.
                async with session_scope() as session:
                    current = await solutions.access(session, solution.id, users[0].id)
                    await solutions.deploy(session, current, users[0].id, metadata, {"KEY": "second"})
                    await session.commit()
                    latest_id = current.desired_revision_id
            elif return_to_active:
                # A,B,A while A is applying reuses A's active lease and leaves B obsolete.
                async with session_scope() as session:
                    current = await solutions.access(session, solution.id, users[0].id)
                    await solutions.rollback(session, current, latest_id, users[0].id)
                    await solutions.rollback(session, current, revision_id, users[0].id)
                    duplicate = await operations.enqueue(session, kind=OperationKind.solution_deploy, target_id=revision_id)
                    assert duplicate.lease_expires_at is not None
                    await session.commit()

        async def aclose(self) -> None:
            """Close the adapter."""

    monkeypatch.setattr(runtime, "Kubernetes", Kubernetes)
    await execute(initial)
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.deployed_revision_id == initial.target_id
        assert current.desired_revision_id == latest_id
    latest = await claim_operation()
    assert latest is not None and latest.target_id == latest_id
    async with session_scope() as session:
        await operations.enqueue(session, kind=OperationKind.solution_deploy, target_id=initial.target_id)
        await session.commit()
    await execute(latest)
    recovery = await claim_operation()
    assert recovery is not None and recovery.target_id == initial.target_id
    await execute(recovery)

    # A recovery queued behind a newer successful deployment cannot replace it.
    assert applied == ["first", "second"]

    # A superseded rollback is skipped without retargeting its immutable operation.
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, users[0].id)
        await solutions.rollback(session, current, initial.target_id, users[0].id)
        await solutions.deploy(session, current, users[0].id, metadata, {"KEY": "second"})
        await session.commit()
        newest_id = current.desired_revision_id
    rollback = await claim_operation()
    assert rollback is not None and rollback.kind == OperationKind.solution_deploy
    assert (await execute(rollback)).failed is None
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision_id == newest_id
        assert current.deployed_revision_id == latest_id
    newest = await claim_operation()
    assert newest is not None and newest.target_id == newest_id
    assert (await execute(newest)).failed is None
    assert applied == ["first", "second", "second"]

    # A,B,A coalesces A and skips B so the final runtime still matches desired A.
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, users[0].id)
        await solutions.rollback(session, current, initial.target_id, users[0].id)
        await solutions.deploy(session, current, users[0].id, metadata, {"KEY": "second"})
        await solutions.rollback(session, current, initial.target_id, users[0].id)
        await session.commit()
    for kind in (OperationKind.solution_deploy, OperationKind.solution_deploy):
        command = await claim_operation()
        assert command is not None and command.kind == kind
        assert (await execute(command)).failed is None
    assert applied == ["first", "second", "second", "first"]
    assert await claim_operation() is None
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision_id == current.deployed_revision_id == initial.target_id

    # Returning to an active target also skips the intervening queued rollback.
    return_to_active = True
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, users[0].id)
        await solutions.rollback(session, current, initial.target_id, users[0].id)
        await session.commit()
    active = await claim_operation()
    assert active is not None
    assert (await execute(active)).failed is None
    outdated = await claim_operation()
    assert outdated is not None and outdated.target_id == latest_id
    assert (await execute(outdated)).failed is None
    assert applied[-2:] == ["first", "first"]
    assert await claim_operation() is None

    # A request after the handler skipped A but before completion must not be lost.
    return_to_active = False
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, users[0].id)
        await solutions.rollback(session, current, latest_id, users[0].id)
        await solutions.rollback(session, current, initial.target_id, users[0].id)
        await session.commit()
    skipped = await claim_operation()
    assert skipped is not None and skipped.target_id == latest_id
    await runtime.deploy(skipped.target_id)
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, users[0].id)
        await solutions.rollback(session, current, latest_id, users[0].id)
        await session.commit()
    await complete_operation(skipped.id)
    while (pending := await claim_operation()) is not None:
        assert (await execute(pending)).failed is None
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision_id == current.deployed_revision_id == latest_id
