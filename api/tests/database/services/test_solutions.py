import pytest
import asyncio
from uuid import uuid4
from alembic import command
from fastapi import HTTPException
from conftest import create_client
from sqlmodel import col
from factories import add_member, create_solution, create_organization
from src.utils import images
from sqlalchemy import delete, update
from src.database import session as database_session
from alembic.config import Config
from sqlalchemy.exc import IntegrityError
from src.environments import env
from src.models.roles import OrganizationRoles
from src.models.types import Image
from sqlalchemy.engine import URL
from src.models.metadata import LongLinkMetadata
from src.database.session import session_scope
from src.database.services import solutions, organizations
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.association import UserOrganization


async def test_create_rejects_tombstoned_organization(users: tuple[User, User, User]) -> None:
    """Prevent new solutions from restoring a deleted Organization."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await organizations.soft_delete(session, organization.id, owner)
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(HTTPException, match="409: Organization is not available"):
            await solutions.create(
                session,
                organization.id,
                metadata=LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test")),
                name="Dashboard",
                envs={},
                user_id=owner.id,
            )

    # Assert
    async with session_scope() as session:
        fetched, total = await solutions.fetch(session, Pagination())
    assert fetched == []
    assert total == 0


async def test_create_rejects_missing_organization() -> None:
    """Reject solution creation when the Organization does not exist."""

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(HTTPException, match="404: Organization not found"):
            await solutions.create(
                session,
                uuid4(),
                metadata=LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test")),
                name="Dashboard",
                envs={},
                user_id=uuid4(),
            )


async def test_create_refreshes_cached_maintainer_access_before_authorizing(users: tuple[User, User, User]) -> None:
    """Reject a deployment after cached maintainer access is demoted while preserving owner access."""

    # Arrange a current owner and a maintainer whose request authorization could become stale.
    owner, maintainer = users[1], users[2]
    organization = await create_organization(owner)
    await add_member(user=maintainer, organization=organization, role=OrganizationRoles.maintain)

    # Cache the maintainer as the route dependency does before awaiting external image metadata.
    async with session_scope() as session:
        cached_membership = await organizations.require_membership(session, maintainer.id, organization.id)
        assert cached_membership is not None
        assert cached_membership.role == OrganizationRoles.maintain

        # Demote the maintainer in a concurrent transaction after the request cached its authorization state.
        async with session_scope() as concurrent_session:
            membership = await concurrent_session.get(UserOrganization, (maintainer.id, organization.id))
            assert membership is not None
            membership.role = OrganizationRoles.read
            await concurrent_session.commit()

        # Act and assert the demoted maintainer cannot create a Solution, while the owner still can.
        with pytest.raises(HTTPException, match="403: Permission required"):
            await solutions.create(
                session,
                organization.id,
                metadata=LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test")),
                name="Blocked dashboard",
                envs={},
                user_id=maintainer.id,
            )
        solution = await solutions.create(
            session,
            organization.id,
            metadata=LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test")),
            name="Owner dashboard",
            envs={},
            user_id=owner.id,
        )
        await session.commit()

    assert solution.organization_id == organization.id


async def test_delete_rejects_read_member_without_mutating_solution(users: tuple[User, User, User]) -> None:
    """Reject read members from deleting a Solution."""

    # Arrange
    owner, caller = users[0], users[1]
    organization = await create_organization(owner)
    solution = await create_solution(organization)
    await add_member(user=caller, organization=organization, role=OrganizationRoles.read)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(HTTPException, match="403: Permission required"):
            await solutions.delete(session, solution.id, caller.id)

    # Assert the denied deletion left the Solution unchanged in a fresh session.
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.deleted_at is None


@pytest.mark.integration
@pytest.mark.no_db
async def test_revision_ownership_constraints_and_cleanup(monkeypatch: pytest.MonkeyPatch, postgres_url: URL) -> None:
    """Exercise revision ownership, concurrent updates, and cascade cleanup on PostgreSQL."""

    # Migrate the fixture's fresh database using the application's async URL contract.
    database_url = postgres_url.set(drivername="postgresql+asyncpg")
    monkeypatch.setattr(env, "DATABASE_URL", database_url.update_query_dict({"ssl": "disable"}).render_as_string(hide_password=False))
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
        first = await create_solution(organization, envs={"KEEP": "postgres-secret"})
        second = await create_solution(organization, name="other")

        # Competing HTTP commands inspect outside PostgreSQL locks, then serialize their snapshots.
        barrier = asyncio.Barrier(2)

        async def metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
            """Release both registry inspections together to exercise real row locking."""

            await asyncio.wait_for(barrier.wait(), timeout=5)
            return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:updated"))

        monkeypatch.setattr(images, "required_metadata", metadata)
        async with create_client(owner) as client:
            url = f"/api/v1/solutions/{first.id}/update"
            responses = await asyncio.gather(client.post(url, json={}), client.post(url, json={}))
            assert sorted(response.status_code for response in responses) == [204, 409]
            async with session_factory() as session:
                current = await session.get(Solution, first.id)
                assert current is not None
                revision = await session.get(Revision, current.desired_revision_id)
                assert revision is not None
                assert revision.envs == {"KEEP": "postgres-secret"}

        # The actual migrated schema independently enforces same-Solution pointers.
        for reference in ("desired_revision_id", "deployed_revision_id"):
            async with session_factory() as session:
                # Accept constraint violations raised by either the UPDATE or its commit.
                with pytest.raises(IntegrityError):  # noqa: PT012
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
        # Dispose database connections before the fixture removes the database.
        await engine.dispose()
