import pytest
import asyncio
from alembic import command
from conftest import create_client
from sqlmodel import col
from factories import create_solution, create_organization
from containers import postgres_container
from sqlalchemy import text, delete, update
from src.database import session as database_session
from alembic.config import Config
from sqlalchemy.exc import IntegrityError
from src.environments import env
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution

pytestmark = [pytest.mark.integration, pytest.mark.no_db]


async def test_initial_migration_revision_constraints_and_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    """Exercise the collapsed migration, ownership constraints, and cyclic-FK cleanup on PostgreSQL."""

    with postgres_container("longlink", "secret", "longlink") as container:
        database_url = container.get_connection_url(driver="asyncpg")
        monkeypatch.setattr(env, "DATABASE_URL", f"{database_url}?ssl=disable")
        config = Config("alembic.ini")
        await asyncio.to_thread(command.upgrade, config, "head")
        await asyncio.to_thread(command.check, config)
        engine = create_async_engine(database_url)
        try:
            session_factory = async_sessionmaker(engine, expire_on_commit=False)
            monkeypatch.setattr(database_session, "Session", session_factory)
            async with session_factory() as session:
                # Verify the collapsed migration installs the same partial index as the ORM.
                definition = await session.scalar(
                    text("SELECT indexdef FROM pg_indexes WHERE indexname = 'uq_operations_unfinished_target'")
                )
                assert definition is not None
                assert "UNIQUE INDEX" in definition and "(kind, target_id)" in definition
                assert "WHERE (finished_at IS NULL)" in definition
                assert (
                    await session.scalar(
                        text(
                            "SELECT count(*) FROM information_schema.columns WHERE table_name = 'operations' AND column_name = 'unleased_target_id'"
                        )
                    )
                    == 0
                )

                owner = User(name="Owner", email="owner@example.com", password="unused")
                session.add(owner)
                await session.commit()
            organization = await create_organization(owner)
            first = await create_solution(organization, secrets={"KEEP": "postgres-secret"})
            second = await create_solution(organization, name="other")

            # Competing HTTP commands inspect outside PostgreSQL locks, then serialize their snapshots.
            barrier = asyncio.Barrier(2)

            async def metadata(_image: Image) -> LongLinkMetadata:
                """Release both registry inspections together to exercise real row locking."""

                await asyncio.wait_for(barrier.wait(), timeout=5)
                return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:updated"))

            monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
            async with create_client(owner) as client:
                url = f"/api/v1/solutions/{first.id}/update"
                responses = await asyncio.gather(client.post(url, json={}), client.post(url, json={}))
                assert sorted(response.status_code for response in responses) == [204, 409]
                history = await client.get(f"/api/v1/solutions/{first.id}/revisions")
                assert history.status_code == 200 and len(history.json()) == 2
                assert history.json()[0]["configured_envs"] == ["KEEP"]
                assert "postgres-secret" not in history.text

            # The actual migrated schema independently enforces same-Solution pointers.
            for reference in ("desired_revision_id", "deployed_revision_id"):
                async with session_factory() as session:
                    with pytest.raises(IntegrityError):
                        await session.execute(
                            update(Solution).where(col(Solution.id) == first.id).values({reference: second.desired_revision_id})
                        )
                        await session.commit()

            # PostgreSQL cascades parent deletion through only its owned snapshots.
            async with session_factory() as session:
                await session.execute(delete(Solution).where(col(Solution.id) == first.id))
                await session.commit()
                assert await session.get(Revision, first.desired_revision_id) is None
                assert await session.get(Revision, second.desired_revision_id) is not None
        finally:
            await engine.dispose()
        await asyncio.to_thread(command.downgrade, config, "base")
