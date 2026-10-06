import pytest
import asyncio
from alembic import command
from conftest import create_client
from sqlmodel import col
from factories import create_solution, create_organization
from containers import postgres_container
from sqlalchemy import delete, select, update
from src.database import session as database_session
from alembic.config import Config
from sqlalchemy.exc import IntegrityError
from src.environments import env
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation

pytestmark = [pytest.mark.integration, pytest.mark.no_db]


async def test_revision_ownership_constraints_and_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    """Exercise revision ownership, concurrent updates, and cascade cleanup on PostgreSQL."""

    with postgres_container("longlink", "secret", "longlink") as container:
        database_url = container.get_connection_url(driver="asyncpg")
        monkeypatch.setattr(env, "DATABASE_URL", f"{database_url}?ssl=disable")
        config = Config("alembic.ini")
        await asyncio.to_thread(command.upgrade, config, "head")
        engine = create_async_engine(database_url)
        try:
            session_factory = async_sessionmaker(engine, expire_on_commit=False)
            monkeypatch.setattr(database_session, "Session", session_factory)
            async with session_factory() as session:
                owner = User(name="Owner", email="owner@example.com", password="unused")
                session.add(owner)
                await session.commit()
            organization = await create_organization(owner)
            first = await create_solution(organization, secrets={"KEEP": "postgres-secret"})
            second = await create_solution(organization, name="other")

            # Arrange: snapshot committed revisions and deployment work before either request can mutate them.
            async with session_factory() as session:
                revision_result = await session.scalars(select(col(Revision.id)).where(col(Revision.solution_id) == first.id))
                previous_revision_ids = set(revision_result.all())
                operation_result = await session.scalars(
                    select(col(Operation.id)).where(col(Operation.kind) == OperationKind.solution_deploy)
                )
                previous_operation_ids = set(operation_result.all())

            # Arrange: competing HTTP commands inspect outside PostgreSQL locks, then serialize their snapshots.
            barrier = asyncio.Barrier(2)

            async def metadata(_image: Image) -> LongLinkMetadata:
                """Release both registry inspections together to exercise real row locking."""

                await asyncio.wait_for(barrier.wait(), timeout=5)
                return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:updated"))

            monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
            async with create_client(owner) as client:
                # Act: release both external inspections together while keeping database writes real.
                url = f"/api/v1/solutions/{first.id}/update"
                responses = await asyncio.gather(client.post(url, json={}), client.post(url, json={}))

                # Assert: the losing request leaves neither an orphan revision nor extra deployment work.
                assert sorted(response.status_code for response in responses) == [204, 409]
                async with session_factory() as session:
                    current = await session.get(Solution, first.id)
                    assert current is not None
                    revision = await session.get(Revision, current.desired_revision_id)
                    assert revision is not None
                    assert revision.configured_envs == ["KEEP"]
                    assert revision.envs == {"KEEP": "postgres-secret"}
                    revision_result = await session.scalars(select(col(Revision.id)).where(col(Revision.solution_id) == first.id))
                    current_revision_ids = set(revision_result.all())
                    assert current_revision_ids == previous_revision_ids | {revision.id}
                    assert revision.id not in previous_revision_ids
                    operation_result = await session.scalars(select(Operation).where(col(Operation.kind) == OperationKind.solution_deploy))
                    current_operations = operation_result.all()
                    new_operations = [operation for operation in current_operations if operation.id not in previous_operation_ids]
                    assert len(new_operations) == 1
                    assert new_operations[0].target_id == revision.id
                    assert {operation.id for operation in current_operations} == previous_operation_ids | {new_operations[0].id}

            # The actual migrated schema independently enforces same-Solution pointers.
            async def point_revision_at_other_solution(session: AsyncSession, reference: str) -> None:
                """Point one Solution reference at another Solution's revision."""

                await session.execute(
                    update(Solution).where(col(Solution.id) == first.id).values({reference: second.desired_revision_id})
                )
                await session.commit()

            for reference in ("desired_revision_id", "deployed_revision_id"):
                async with session_factory() as session:
                    with pytest.raises(IntegrityError):
                        await point_revision_at_other_solution(session, reference)

            # PostgreSQL cascades parent deletion through only its owned snapshots.
            async with session_factory() as session:
                await session.execute(delete(Solution).where(col(Solution.id) == first.id))
                await session.commit()
                assert await session.get(Revision, first.desired_revision_id) is None
                assert await session.get(Revision, second.desired_revision_id) is not None
        finally:
            await engine.dispose()
