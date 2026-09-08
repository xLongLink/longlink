import pytest
import asyncio
from uuid import uuid4
from factories import claim_operation, queue_operation
from containers import postgres_container
from sqlalchemy import MetaData, select
from src.database import session as database_session
from sqlalchemy.exc import IntegrityError
from src.database.models import registry
from src.database.services import operations
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.operations import Operation

pytestmark = [pytest.mark.integration, pytest.mark.no_db]


async def test_claim_globally_leases_one_operation_to_one_concurrent_worker(monkeypatch: pytest.MonkeyPatch) -> None:
    """Coalesce duplicate work and globally lease one Operation across PostgreSQL workers."""

    with postgres_container("longlink", "secret", "longlink") as container:
        database_url = container.get_connection_url(driver="psycopg")
        engine = create_async_engine(database_url)
        try:
            # Build the real PostgreSQL schema and bind the production session service to it for this test only.
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

            # Race duplicate operation creations, then add unrelated work on another target.
            duplicates = await asyncio.gather(
                queue_operation(target_id=first_target_id),
                queue_operation(target_id=first_target_id),
            )
            waiting = await queue_operation(target_id=second_target_id)

            # Run two workers concurrently so each claim uses an independent session and row lock.
            claims = await asyncio.gather(claim_operation(), claim_operation())
            claimed = [claim for claim in claims if claim is not None]

            # Reload the queue independently and verify one global lease while unrelated work waits.
            async with session_factory() as session:
                persisted = (await session.execute(select(Operation))).scalars().all()

            assert duplicates[0].id == duplicates[1].id
            assert len(claimed) == 1
            assert claimed[0].id == duplicates[0].id
            assert len(persisted) == 2
            persisted_by_id = {operation.id: operation for operation in persisted}
            assert persisted_by_id[claimed[0].id].lease_expires_at is not None
            assert persisted_by_id[waiting.id].lease_expires_at is None

            # The real partial index rejects duplicates even while the target is leased.
            duplicate = await queue_operation(target_id=first_target_id)
            assert duplicate.id == claimed[0].id
            async with session_factory() as session:
                session.add(Operation(kind=duplicate.kind, target_id=first_target_id))
                with pytest.raises(IntegrityError):
                    await session.commit()
                await session.rollback()

                # Releasing a deduplicated lease cannot collide with another unfinished row.
                assert await operations.release(session, duplicate.id) is not None
                await session.commit()
            resumed = await claim_operation()
            assert resumed is not None and resumed.id == duplicate.id
            async with session_factory() as session:
                assert await operations.complete(session, resumed.id) is not None
                await session.commit()
            replacement = await queue_operation(target_id=first_target_id)
            assert replacement.id != duplicate.id
        finally:
            # Dispose database connections before Testcontainers removes PostgreSQL.
            await engine.dispose()
