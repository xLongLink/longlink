import pytest
import asyncio
from uuid import uuid4
from factories import claim_operation, queue_operation
from containers import postgres_container, require_docker_daemon
from contextlib import ExitStack
from sqlalchemy import MetaData, select
from src.database import session as database_session
from sqlalchemy.engine import make_url
from src.database.models import registry
from src.database.services import operations
from src.models.operations import OperationStatus
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.operations import Operation
from testcontainers.community.mysql import MySqlContainer

pytestmark = [pytest.mark.integration, pytest.mark.no_db]


@pytest.mark.parametrize("backend", ["postgresql", "mysql"])
async def test_claim_globally_leases_one_operation_to_one_concurrent_worker(monkeypatch: pytest.MonkeyPatch, backend: str) -> None:
    """Coalesce sequential work while safely consuming duplicates across database workers."""

    # Keep both real databases alive until their async connections are disposed.
    with ExitStack() as stack:
        if backend == "postgresql":
            container = stack.enter_context(postgres_container("longlink", "secret", "longlink"))
            database_url = make_url(container.get_connection_url(driver="psycopg"))
        else:
            require_docker_daemon()
            mysql = MySqlContainer(
                image="mysql:8.4",
                dialect="pymysql",
                username="longlink",
                password="secret",
                dbname="longlink",
            )
            stack.enter_context(mysql)
            database_url = make_url(mysql.get_connection_url()).set(drivername="mysql+aiomysql")
        engine = create_async_engine(database_url, isolation_level="READ COMMITTED")
        try:
            # Build the real schema and bind the production session service to it for this test only.
            # ALTER-based cyclic constraints must not change later SQLite DDL compilation.
            metadata = MetaData()
            for table in registry.metadata.tables.values():
                table.to_metadata(metadata)
            async with engine.begin() as connection:
                await connection.run_sync(metadata.create_all)

            session_factory = async_sessionmaker(engine, expire_on_commit=False)
            monkeypatch.setattr(database_session, "Session", session_factory)

            # Queue independent targets without invoking unrelated resource setup.
            first_target_id = uuid4()
            second_target_id = uuid4()

            # Sequential enqueue coalesces; direct insertion deterministically models a best-effort race.
            first = await queue_operation(target_id=first_target_id)
            coalesced = await queue_operation(target_id=first_target_id)
            assert coalesced.id == first.id
            duplicate = Operation(kind=first.kind, target_id=first_target_id)
            async with session_factory() as session:
                session.add(duplicate)
                await session.commit()
            waiting = await queue_operation(target_id=second_target_id)
            queued_ids = {first.id, duplicate.id, waiting.id}

            # Run two workers concurrently so each claim uses an independent session and row lock.
            claims = await asyncio.gather(claim_operation(), claim_operation())
            claimed = [claim for claim in claims if claim is not None]

            # Reload the queue independently and verify one global lease while unrelated work waits.
            async with session_factory() as session:
                result = await session.scalars(select(Operation))
                persisted = result.all()

            assert len(claimed) == 1
            assert {operation.id for operation in persisted} == queued_ids
            assert {operation.id for operation in persisted if operation.lease_expires_at is not None} == {claimed[0].id}
            assert await claim_operation() is None

            # Releasing work remains safe with multiple unfinished rows for the same target.
            async with session_factory() as session:
                released = await operations.release(session, claimed[0].id)
                assert released is not None and released.status == OperationStatus.scheduled
                await session.commit()

            # Consume every queued row once, exercising both successful and failed guarded updates.
            finished_ids = set()
            for fail in (False, True, False):
                resumed = await claim_operation()
                assert resumed is not None
                assert resumed.id in queued_ids - finished_ids
                assert await claim_operation() is None
                async with session_factory() as session:
                    if fail:
                        finished = await operations.fail(session, resumed.id, "worker failed", logs=["failed attempt"])
                        assert finished is not None and finished.status == OperationStatus.failed
                        assert finished.failed == "worker failed"
                        assert finished.logs == ["failed attempt"]
                    else:
                        finished = await operations.complete(session, resumed.id, logs=["completed attempt"])
                        assert finished is not None and finished.status == OperationStatus.completed
                        assert finished.logs == ["completed attempt"]
                    assert finished.lease_expires_at is None
                    assert finished.finished_at is not None
                    await session.commit()
                finished_ids.add(resumed.id)
            assert finished_ids == queued_ids
            assert await claim_operation() is None

            # Finished duplicates remain in history and no longer suppress replacement work.
            replacement = await queue_operation(target_id=first_target_id)
            assert replacement.id not in queued_ids
            async with session_factory() as session:
                result = await session.scalars(select(Operation))
                history = result.all()
            assert {operation.id for operation in history if operation.finished_at is not None} == queued_ids
            assert {operation.id for operation in history if operation.finished_at is None} == {replacement.id}
        finally:
            # Dispose database connections before Testcontainers removes the database.
            await engine.dispose()
