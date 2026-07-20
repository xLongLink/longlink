import pytest
import asyncio
from sqlmodel import SQLModel
from containers import DockerRuntimeContainer, wait_for_postgres, require_docker_daemon
from sqlalchemy import select
from src.database import session as database_session
from src.environments import env
from src.database.models import users, computes, storages, databases, association, invitations, applications, organizations
from src.database.services import operations
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation

pytestmark = [pytest.mark.integration, pytest.mark.no_db]
POSTGRES_PORT = 5432


async def test_claim_next_leases_one_operation_to_one_concurrent_worker(monkeypatch: pytest.MonkeyPatch) -> None:
    """Coalesce concurrent enqueue calls and lease their work to exactly one PostgreSQL worker."""

    # Skip only when the Docker daemon cannot be reached.
    require_docker_daemon()
    container = DockerRuntimeContainer(
        "postgres:16-alpine",
        ports=[POSTGRES_PORT],
        environment={
            "POSTGRES_USER": "longlink",
            "POSTGRES_PASSWORD": "secret",
            "POSTGRES_DB": "longlink",
        },
    )
    container.start()

    engine: AsyncEngine | None = None
    try:
        # Build the real PostgreSQL schema and bind the production session service to it for this test only.
        wait_for_postgres(container, "longlink", "secret", "longlink", POSTGRES_PORT)
        database_url = f"postgresql+psycopg://longlink:secret@{container.host()}:{container.port(POSTGRES_PORT)}/longlink"
        engine = create_async_engine(database_url)
        async with engine.begin() as connection:
            await connection.run_sync(SQLModel.metadata.create_all)

        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        monkeypatch.setattr(database_session, "_engine", engine)
        monkeypatch.setattr(database_session, "Session", session_factory)

        # Create one compute target without invoking the registry service's queue side effect.
        async with session_factory() as session:
            compute = ComputeRegistry(
                name="Local",
                slug="local",
                kubeconfig="apiVersion: v1\nclusters: []\n",
                proxy_secret="proxy-secret",
            )
            session.add(compute)
            await session.commit()
            await session.refresh(compute)

        # Race independent enqueue transactions against the partial unique index.
        enqueue_tasks = [asyncio.create_task(operations.enqueue(compute.id)) for _ in range(2)]
        enqueued = await asyncio.gather(*enqueue_tasks)

        # Run two workers concurrently so each claim uses an independent session and PostgreSQL row lock.
        workers = [asyncio.create_task(operations.claim_next()) for _ in range(2)]
        claims = await asyncio.gather(*workers)
        claimed = [claim for claim in claims if claim is not None]

        # Reload the queue independently and verify one open row and one persisted lease.
        async with session_factory() as session:
            persisted = (await session.execute(select(Operation))).scalars().all()

        assert enqueued[0].id == enqueued[1].id
        assert len(claimed) == 1
        assert claimed[0].id == enqueued[0].id
        assert claimed[0].lease_expires_at is not None
        assert len(persisted) == 1
        assert persisted[0].platform_version == env.VERSION
        assert persisted[0].attempt_count == 1
        assert persisted[0].started_at is not None
        assert persisted[0].lease_expires_at == claimed[0].lease_expires_at
    finally:
        # Dispose database connections before removing the PostgreSQL container.
        try:
            if engine is not None:
                await engine.dispose()
        finally:
            container.stop()
