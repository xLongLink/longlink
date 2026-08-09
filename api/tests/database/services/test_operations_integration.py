import pytest
import asyncio
from factories import queue_operation
from containers import start_postgres
from sqlalchemy import select
from src.database import session as database_session
from src.environments import env
from src.database.services import operations
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from src.database.models.computes import ComputeRegistry
from src.database.models.base import PlatformModel
from src.database.models.operations import Operation

pytestmark = [pytest.mark.integration, pytest.mark.no_db]
POSTGRES_PORT = 5432


async def test_claim_globally_leases_one_operation_to_one_concurrent_worker(monkeypatch: pytest.MonkeyPatch) -> None:
    """Coalesce duplicate work and globally lease one Operation across PostgreSQL workers."""

    container = start_postgres("longlink", "secret", "longlink", POSTGRES_PORT)

    engine: AsyncEngine | None = None
    try:
        # Build the real PostgreSQL schema and bind the production session service to it for this test only.
        database_url = f"postgresql+psycopg://longlink:secret@{container.host()}:{container.port(POSTGRES_PORT)}/longlink"
        engine = create_async_engine(database_url)
        async with engine.begin() as connection:
            await connection.run_sync(PlatformModel.metadata.create_all)

        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        monkeypatch.setattr(database_session, "Session", session_factory)

        # Create independent compute targets without invoking registry service queue side effects.
        async with session_factory() as session:
            first_compute = ComputeRegistry(
                name="First",
                kubeconfig={"apiVersion": "v1", "clusters": []},
                version=env.VERSION,
            )
            second_compute = ComputeRegistry(
                name="Second",
                kubeconfig={"apiVersion": "v1", "clusters": []},
                version=env.VERSION,
            )
            session.add_all([first_compute, second_compute])
            await session.commit()

        # Race duplicate operation creations, then add unrelated work on another compute.
        duplicates = await asyncio.gather(
            queue_operation(first_compute.id, target_id=first_compute.id),
            queue_operation(first_compute.id, target_id=first_compute.id),
        )
        waiting = await queue_operation(
            second_compute.id,
            target_id=second_compute.id,
        )

        # Run two workers concurrently so each claim uses an independent session and row lock.
        claims = await asyncio.gather(operations.claim(), operations.claim())
        claimed = [claim for claim in claims if claim is not None]

        # Reload the queue independently and verify one global lease while unrelated work waits.
        async with session_factory() as session:
            persisted = (await session.execute(select(Operation))).scalars().all()

        assert duplicates[0].id == duplicates[1].id
        assert len(claimed) == 1
        assert claimed[0].id == duplicates[0].id
        assert claimed[0].lease_expires_at is not None
        assert len(persisted) == 2
        persisted_by_id = {operation.id: operation for operation in persisted}
        active = persisted_by_id[claimed[0].id]
        queued = persisted_by_id[waiting.id]
        assert active.platform_version == env.VERSION
        assert active.lease_expires_at == claimed[0].lease_expires_at
        assert queued.lease_expires_at is None
    finally:
        # Dispose database connections before removing the PostgreSQL container.
        try:
            if engine is not None:
                await engine.dispose()
        finally:
            container.stop()
