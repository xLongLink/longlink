import pytest
import asyncio
from uuid import UUID, uuid4
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from factories import create_compute, fail_operation, claim_operation, fetch_operations, complete_operation
from factories import queue_operation as queue
from sqlalchemy import Select, select
from src.database import session as database_session
from sqlalchemy.engine import URL
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind, OperationStatus
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def test_operations_service_create_coalesces_and_reopens_completed_work() -> None:
    """Coalesce unfinished work by target and create successors after completion."""

    first_solution_id = uuid4()
    organization_id = uuid4()

    solution = await queue(kind=OperationKind.solution_deploy, target_id=first_solution_id)
    duplicate = await queue(kind=OperationKind.solution_deploy, target_id=first_solution_id)
    await queue(kind=OperationKind.organization_create, target_id=organization_id)
    fetched = await fetch_operations()

    assert duplicate.id == solution.id
    assert len(fetched) == 2

    # Deduplication preserves distinct operation targets and kinds.
    assert {(item.kind, item.target_id) for item in fetched} == {
        (OperationKind.solution_deploy, first_solution_id),
        (OperationKind.organization_create, organization_id),
    }

    # Claim through the real lease transition before checking worker-visible state.
    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.id == solution.id
    completed = await complete_operation(claimed.id)
    replacement = await queue(kind=OperationKind.solution_deploy, target_id=first_solution_id)

    assert completed is True
    assert replacement.id != solution.id


async def test_operations_service_claim_claims_oldest_available_operation() -> None:
    """Claim the oldest available Operation first."""

    older_operation = await queue(target_id=uuid4())
    await queue(target_id=uuid4())

    async with session_scope() as session:
        older_row = await session.get(Operation, older_operation.id)
        assert older_row is not None
        older_row.created_at = datetime.now(UTC) - timedelta(days=1)
        await session.commit()

    # Observe the claim only after its setup transaction is committed.
    claimed = await claim_operation()

    assert claimed is not None
    assert claimed.id == older_operation.id


async def test_operations_service_claim_serializes_active_work() -> None:
    """Allow only one active operation at a time."""

    await queue(target_id=uuid4())
    waiting = await queue(target_id=uuid4())

    active_claim = await claim_operation()
    assert active_claim is not None
    assert await claim_operation() is None

    await complete_operation(active_claim.id)
    waiting_claim = await claim_operation()
    assert waiting_claim is not None

    # Completing the active claim releases its queued successor.
    await complete_operation(waiting_claim.id)

    assert waiting_claim.id == waiting.id
    assert await claim_operation() is None


async def test_operations_service_claim_reclaims_expired_work() -> None:
    """Reclaim an operation abandoned by a worker after its lease expires."""

    # Seed and claim work that its worker will abandon.
    expired = await queue(target_id=uuid4())
    expired_claim = await claim_operation()
    assert expired_claim is not None

    # Expire the worker lease before the next claim attempt.
    async with session_scope() as session:
        row = await session.get(Operation, expired.id)
        assert row is not None
        row.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    reclaimed = await claim_operation()
    expired_row = next(item for item in await fetch_operations() if item.id == expired.id)

    # Verify another worker owns the abandoned work without making it terminal.
    assert reclaimed is not None
    assert reclaimed.id == expired.id
    assert expired_row.status == OperationStatus.active
    assert expired_row.lease_expires_at is not None
    assert expired_row.finished_at is None
    assert expired_row.failed is None


async def test_operations_service_expired_leases_cannot_finish() -> None:
    """Keep expired work available for another worker instead of finishing it."""

    # Claim an operation and expire its only lease.
    operation = await queue(target_id=uuid4())
    claimed = await claim_operation()
    assert claimed is not None

    # Expire the worker lease before it can persist an outcome.
    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    expired_completion = await complete_operation(operation.id)
    expired_failure = await fail_operation(operation.id)
    row = next(item for item in await fetch_operations() if item.id == operation.id)

    # Verify an expired worker cannot finish work it no longer owns.
    assert expired_completion is False
    assert expired_failure is False
    assert row.status == OperationStatus.scheduled
    assert row.finished_at is None


async def test_operations_service_records_bounded_failure_reason() -> None:
    """Persist a bounded failure reason in the failed operation field."""

    # Arrange
    operation = await queue(target_id=uuid4())
    claimed = await claim_operation()
    assert claimed is not None

    # Act
    failed = await fail_operation(operation.id, "migration job failed" * 100)

    # Assert
    assert failed is True

    # Verify the bounded reason was committed independently of the transition result.
    async with session_scope() as session:
        persisted = await session.get(Operation, operation.id)
    assert persisted is not None
    assert persisted.failed == ("migration job failed" * 100)[:500]


async def test_operations_service_failed_creation_updates_targets_and_resolves_resource_names() -> None:
    """Expose failed creation work with its concrete failed resource names."""

    # Arrange
    compute_registry = await create_compute()
    async with session_scope() as session:
        organization = Organization(name="Acme", slug="acme", compute_id=compute_registry.id)
        session.add(organization)
        await session.flush()
        solution = Solution(organization_id=organization.id, name="Dashboard", slug="dashboard", secrets={})
        session.add(solution)
        await session.flush()
        revision = Revision(solution_id=solution.id, image="ghcr.io/longlink/dashboard@sha256:resolved", envs={})

        # Persist the revision before constructing its deployment command.
        session.add(revision)
        await session.flush()
        solution.desired_revision_id = revision.id
        await session.commit()

    organization_operation = await queue(kind=OperationKind.organization_create, target_id=organization.id)
    organization_claim = await claim_operation()
    assert organization_claim is not None
    assert organization_claim.id == organization_operation.id
    assert await fail_operation(organization_operation.id, "organization creation failed") is True

    solution_operation = await queue(kind=OperationKind.solution_deploy, target_id=solution.desired_revision_id)

    # Claim the queued deployment through the production worker transition.
    solution_claim = await claim_operation()
    assert solution_claim is not None
    assert solution_claim.id == solution_operation.id
    assert await fail_operation(solution_operation.id, "solution creation failed") is True

    # Act
    async with session_scope() as session:
        organization_row = await session.get(Organization, organization.id)
        solution_row = await session.get(Solution, solution.id)
        items, total = await operations.fetch(session, Pagination())

    # Assert
    assert organization_row is not None
    assert organization_row.status == Status.failed
    assert solution_row is not None
    assert solution_row.status == Status.failed
    assert total == 2

    items_by_kind = {item["kind"]: item for item in items}
    organization_item = items_by_kind[OperationKind.organization_create]
    solution_item = items_by_kind[OperationKind.solution_deploy]
    assert organization_item["resource_name"] == organization.name
    assert organization_item["status"] == OperationStatus.failed

    # Solution operations retain their own display identity and failure state.
    assert solution_item["resource_name"] == solution.name
    assert solution_item["status"] == OperationStatus.failed


async def test_operations_service_coalesces_claimed_work() -> None:
    """Reuse claimed work and release it for another attempt."""

    # Seed and claim one operation.
    target_id = uuid4()
    await queue(target_id=target_id)
    claimed = await claim_operation()
    assert claimed is not None

    # Create duplicate desired state while the claimed Operation remains immutable.
    follow_up = await queue(target_id=target_id)

    # Verify the request reuses the lease and shutdown can release it safely.
    assert claimed.status == OperationStatus.active
    assert follow_up.id == claimed.id
    assert follow_up.status == OperationStatus.active
    async with session_scope() as session:
        assert await operations.release(session, claimed.id) is True

        # Read the guarded update from persisted state rather than its boolean result.
        released = await session.get(Operation, claimed.id, populate_existing=True)
        await session.commit()
        assert released is not None
        assert released.status == OperationStatus.scheduled
        assert released.lease_expires_at is None


async def test_operations_service_complete_reenqueues_stale_effective_revision() -> None:
    """Requeue the effective revision when an outdated deploy completes."""

    # Create both revisions in the same Organization before either operation runs.
    compute_registry = await create_compute()
    async with session_scope() as session:
        organization = Organization(name="Acme", slug="acme", compute_id=compute_registry.id)
        session.add(organization)
        await session.flush()
        solution = Solution(organization_id=organization.id, name="Dashboard", slug="dashboard", secrets={})
        session.add(solution)
        await session.flush()

        # Preserve the observed release independently of the next desired snapshot.
        deployed_revision = Revision(
            solution_id=solution.id, image="ghcr.io/longlink/dashboard@sha256:one", envs={}, deployed_at=datetime.now(UTC)
        )
        session.add(deployed_revision)
        await session.flush()
        desired_revision = Revision(solution_id=solution.id, image="ghcr.io/longlink/dashboard@sha256:two", envs={})
        session.add(desired_revision)
        await session.flush()
        solution.desired_revision_id = desired_revision.id

        # Persist observed state independently of the desired release.
        solution.deployed_revision_id = deployed_revision.id
        await session.commit()

    # Arrange
    outdated = await queue(kind=OperationKind.solution_deploy, target_id=deployed_revision.id)
    assert await claim_operation() is not None

    # Act
    completed = await complete_operation(outdated.id)

    # Assert
    assert completed is True
    follow_ups = [item for item in await fetch_operations() if item.target_id == desired_revision.id]
    assert len(follow_ups) == 1
    assert follow_ups[0].kind == OperationKind.solution_deploy


@pytest.mark.integration
@pytest.mark.no_db
@pytest.mark.parametrize("backend", ["postgresql", "mysql"])
async def test_claim_globally_leases_one_operation_to_one_concurrent_worker(
    monkeypatch: pytest.MonkeyPatch, backend: str, request: pytest.FixtureRequest
) -> None:
    """Coalesce sequential work while safely consuming duplicates across database workers."""

    # Request only the selected backend and connect to its fresh database asynchronously.
    if backend == "postgresql":
        database_url: URL = request.getfixturevalue("postgres_url")
        database_url = database_url.set(drivername="postgresql+asyncpg")
    else:
        database_url = request.getfixturevalue("mysql_url")
        database_url = database_url.set(drivername="mysql+aiomysql")
    engine = create_async_engine(database_url, isolation_level="READ COMMITTED")
    try:

        # Create the queue and its audit-user dependency before binding the production session service.
        async with engine.begin() as connection:
            await connection.run_sync(User.__table__.create)
            await connection.run_sync(Operation.__table__.create)

        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        monkeypatch.setattr(database_session, "Session", session_factory)

        # Sequential enqueue coalesces; direct insertion deterministically models a best-effort race.
        target_id = uuid4()
        first = await queue(kind=OperationKind.solution_delete, target_id=target_id)
        coalesced = await queue(kind=first.kind, target_id=target_id)
        assert coalesced.id == first.id
        duplicate = Operation(kind=first.kind, target_id=target_id)
        async with session_factory() as session:
            session.add(duplicate)
            await session.commit()

        # Hold both real initial reads before either worker can attempt its guarded UPDATE.
        barrier = asyncio.Barrier(2)
        read_ids: list[UUID] = []

        async def claim_after_shared_read() -> Operation | None:
            """Force independent workers to race from the same persisted unleased row."""

            async with session_factory() as session:
                scalar = session.scalar

                async def read(statement: Select[tuple[Operation]]) -> Operation | None:
                    """Suspend only after the real queue lookup has returned."""

                    operation = await scalar(statement)
                    assert operation is not None
                    assert operation.lease_expires_at is None
                    read_ids.append(operation.id)
                    async with asyncio.timeout(5):
                        await barrier.wait()

                    # Both workers must contend for the same queued identity.
                    assert operation.id == read_ids[0]
                    return operation

                # Restore the read seam before commit and all later lifecycle assertions.
                with monkeypatch.context() as reads:
                    reads.setattr(session, "scalar", read)
                    operation = await operations.claim(session)
                await session.commit()
                return operation

        # Act with bounded execution and guaranteed cleanup of both worker sessions.
        async with asyncio.timeout(10):
            async with asyncio.TaskGroup() as workers:
                first_worker = workers.create_task(claim_after_shared_read())
                second_worker = workers.create_task(claim_after_shared_read())
        claims = [first_worker.result(), second_worker.result()]

        # Exactly one competing worker may publish a lease.
        claimed = [claim for claim in claims if claim is not None]

        # Assert one winner both in the returned claims and in committed database state.
        assert len(claimed) == 1
        assert claimed[0].status == OperationStatus.active
        assert claimed[0].lease_expires_at is not None
        async with session_factory() as session:
            result = await session.scalars(select(Operation).where(col(Operation.lease_expires_at).is_not(None)))
            [active] = result.all()
            assert active.id == claimed[0].id
            assert active.status == OperationStatus.active

        # A live claim must not be handed to another worker.
        assert await claim_operation() is None

        # Releasing work remains safe with multiple unfinished rows for the same target.
        async with session_factory() as session:
            assert await operations.release(session, claimed[0].id) is True

            # Read the persisted lease state after the guarded transition.
            released = await session.get(Operation, claimed[0].id, populate_existing=True)
            assert released is not None
            assert released.status == OperationStatus.scheduled
            assert released.lease_expires_at is None
            assert released.finished_at is None
            await session.commit()

        # Complete released work and verify persisted state reflects the guarded update.
        resumed = await claim_operation()
        assert resumed is not None
        assert resumed.id == claimed[0].id
        async with session_factory() as session:
            assert await operations.complete(session, resumed.id) is True

            # Read the persisted completion after the guarded transition.
            completed = await session.get(Operation, resumed.id, populate_existing=True)
            assert completed is not None
            assert completed.status == OperationStatus.completed
            assert completed.lease_expires_at is None
            assert completed.finished_at is not None
            await session.commit()

        # Fail the remaining duplicate and verify the queue has no unfinished work.
        remaining = await claim_operation()
        assert remaining is not None
        assert {completed.id, remaining.id} == {first.id, duplicate.id}
        async with session_factory() as session:
            assert await operations.fail(session, remaining.id, "worker failed") is True

            # Read the persisted failure after the guarded transition.
            failed = await session.get(Operation, remaining.id, populate_existing=True)
            assert failed is not None
            assert failed.status == OperationStatus.failed
            assert failed.failed == "worker failed"
            assert failed.lease_expires_at is None
            assert failed.finished_at is not None
            await session.commit()

        # Completed recovery leaves no work available to a new worker.
        assert await claim_operation() is None
        async with session_factory() as session:

            # Recovery must leave no unfinished queue entries.
            unfinished = await session.scalar(select(Operation).where(col(Operation.finished_at).is_(None)))
            assert unfinished is None
    finally:

        # Dispose database connections before the fixture removes the database.
        await engine.dispose()
