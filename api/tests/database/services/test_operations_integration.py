import pytest
import asyncio
from uuid import uuid4
from sqlmodel import col
from factories import claim_operation, queue_operation
from containers import mysql_container, postgres_container
from contextlib import ExitStack
from sqlalchemy import select
from src.database import session as database_session
from sqlalchemy.engine import make_url
from src.database.services import operations
from src.models.operations import OperationKind, OperationStatus
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.operations import Operation

pytestmark = [pytest.mark.integration, pytest.mark.no_db]


@pytest.mark.parametrize("backend", ["postgresql", "mysql"])
async def test_claim_globally_leases_one_operation_to_one_concurrent_worker(monkeypatch: pytest.MonkeyPatch, backend: str) -> None:
    """Coalesce sequential work while safely consuming duplicates across database workers."""

    # Keep both real databases alive until their async connections are disposed.
    with ExitStack() as stack:
        if backend == "postgresql":
            container = stack.enter_context(postgres_container("longlink", "secret", "longlink"))
            database_url = make_url(container.get_connection_url(driver="asyncpg"))
        else:
            mysql = stack.enter_context(mysql_container("longlink", "secret", "longlink"))
            database_url = make_url(mysql.get_connection_url()).set(drivername="mysql+aiomysql")
        engine = create_async_engine(database_url, isolation_level="READ COMMITTED")
        try:
            # Create only the queue table and bind the production session service for this test.
            async with engine.begin() as connection:
                await connection.run_sync(Operation.__table__.create)

            session_factory = async_sessionmaker(engine, expire_on_commit=False)
            monkeypatch.setattr(database_session, "Session", session_factory)

            # Sequential enqueue coalesces; direct insertion deterministically models a best-effort race.
            target_id = uuid4()
            first = await queue_operation(kind=OperationKind.solution_delete, target_id=target_id)
            coalesced = await queue_operation(kind=first.kind, target_id=target_id)
            assert coalesced.id == first.id
            duplicate = Operation(kind=first.kind, target_id=target_id)
            async with session_factory() as session:
                session.add(duplicate)
                await session.commit()

            # Run two workers concurrently so each claim uses an independent session and row lock.
            claims = await asyncio.gather(claim_operation(), claim_operation())
            claimed = [claim for claim in claims if claim is not None]

            assert len(claimed) == 1
            assert claimed[0].status == OperationStatus.active
            assert claimed[0].lease_expires_at is not None
            assert await claim_operation() is None

            # Releasing work remains safe with multiple unfinished rows for the same target.
            async with session_factory() as session:
                released = await operations.release(session, claimed[0].id)
                assert released is not None and released.status == OperationStatus.scheduled
                assert released.lease_expires_at is None
                assert released.finished_at is None
                await session.commit()

            # Complete released work and verify the returned row reflects the guarded update.
            resumed = await claim_operation()
            assert resumed is not None and resumed.id == claimed[0].id
            async with session_factory() as session:
                completed = await operations.complete(session, resumed.id, logs=["completed attempt"])
                assert completed is not None and completed.status == OperationStatus.completed
                assert completed.logs == ["completed attempt"]
                assert completed.lease_expires_at is None
                assert completed.finished_at is not None
                await session.commit()

            # Fail the remaining duplicate and verify the queue has no unfinished work.
            remaining = await claim_operation()
            assert remaining is not None
            assert {completed.id, remaining.id} == {first.id, duplicate.id}
            async with session_factory() as session:
                failed = await operations.fail(session, remaining.id, "worker failed", logs=["failed attempt"])
                assert failed is not None and failed.status == OperationStatus.failed
                assert failed.failed == "worker failed"
                assert failed.logs == ["failed attempt"]
                assert failed.lease_expires_at is None
                assert failed.finished_at is not None
                await session.commit()

            assert await claim_operation() is None
            async with session_factory() as session:
                unfinished = await session.scalar(select(Operation).where(col(Operation.finished_at).is_(None)))
                assert unfinished is None
        finally:
            # Dispose database connections before Testcontainers removes the database.
            await engine.dispose()
