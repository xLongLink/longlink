import pytest
from uuid import uuid4
from factories import create_solution, create_organization
from src.errors import ConflictError, NotFoundError, ForbiddenError
from src.models.roles import OrganizationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import solutions, organizations
from src.models.pagination import Pagination
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization


async def test_create_rejects_duplicate_solution_slug_within_organization(users: tuple[User, User, User]) -> None:
    """Reject duplicate solution slugs inside the same organization."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="duplicate-org")
    await create_solution(organization, name="Dashboard")

    # Act
    async with session_scope() as session:
        with pytest.raises(ConflictError):
            await solutions.create(
                session,
                organization.id,
                "Dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                secrets={},
                user_id=user.id,
            )


async def test_fetch_ignores_deleted_solutions(users: tuple[User, User, User]) -> None:
    """Return only active solutions for administrator views."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="collections-org")
    deleted_solution = await create_solution(organization, name="Dashboard")
    active_solution = await create_solution(organization, name="Reports")
    async with session_scope() as session:
        deleted_solution = await session.get(Solution, deleted_solution.id)
        assert deleted_solution is not None
        deleted_solution.deleted_at = utcnow()
        await session.commit()

        # Act
        fetched, total = await solutions.fetch_page(session, Pagination())

    # Assert
    assert [solution.id for solution in fetched] == [active_solution.id]
    assert total == 1


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
        with pytest.raises(ConflictError, match="Organization is not available"):
            await solutions.create(
                session,
                organization.id,
                "Dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                secrets={},
                user_id=owner.id,
            )

    # Assert
    async with session_scope() as session:
        fetched, total = await solutions.fetch_page(session, Pagination())
    assert fetched == []
    assert total == 0


async def test_create_rejects_missing_organization(users: tuple[User, User, User]) -> None:
    """Reject solution creation when the Organization does not exist."""

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(NotFoundError, match="Organization not found"):
            await solutions.create(
                session,
                uuid4(),
                "Dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                secrets={},
                user_id=users[0].id,
            )


async def test_create_refreshes_cached_maintainer_access_before_authorizing(users: tuple[User, User, User]) -> None:
    """Reject a deployment after cached maintainer access is demoted while preserving owner access."""

    # Arrange a current owner and a maintainer whose request authorization could become stale.
    owner, maintainer = users[1], users[2]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=maintainer.id, organization_id=organization.id, role=OrganizationRoles.maintain))
        await session.commit()

    # Cache the maintainer as the route dependency does before awaiting external image metadata.
    async with session_scope() as session:
        cached_membership = await organizations.membership(session, maintainer.id, organization.id)
        assert cached_membership is not None
        assert cached_membership.role == OrganizationRoles.maintain

        # Demote the maintainer in a concurrent transaction after the request cached its authorization state.
        async with session_scope() as concurrent_session:
            membership = await concurrent_session.get(UserOrganization, (maintainer.id, organization.id))
            assert membership is not None
            membership.role = OrganizationRoles.read
            await concurrent_session.commit()

        # Act and assert the demoted maintainer cannot create a Solution, while the owner still can.
        with pytest.raises(ForbiddenError, match="Permission required"):
            await solutions.create(
                session,
                organization.id,
                "Blocked dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                secrets={},
                user_id=maintainer.id,
            )
        solution = await solutions.create(
            session,
            organization.id,
            "Owner dashboard",
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            secrets={},
            user_id=owner.id,
        )
        await session.commit()

    assert solution.organization_id == organization.id
    assert solution.created_id == owner.id
    assert solution.updated_id == owner.id


async def test_delete_records_the_maintainer_audit_fields(users: tuple[User, User, User]) -> None:
    """Record the maintainer who tombstones a Solution."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(organization)

    # Act
    async with session_scope() as session:
        await solutions.delete(session, solution.id, owner.id)
        await session.commit()
        deleted_solution = await session.get(Solution, solution.id)

    # Assert
    assert deleted_solution is not None
    assert deleted_solution.deleted_at is not None
    assert deleted_solution.updated_at == deleted_solution.deleted_at
    assert deleted_solution.deleted_id == owner.id
    assert deleted_solution.updated_id == owner.id


@pytest.mark.parametrize(
    ("role", "error"),
    [
        pytest.param(None, "Access required", id="non-member"),
        pytest.param(OrganizationRoles.read, "Permission required", id="read-member"),
    ],
)
async def test_delete_rejects_callers_without_maintain_access(
    users: tuple[User, User, User],
    role: OrganizationRoles | None,
    error: str,
) -> None:
    """Require active Organization maintain access before deleting a Solution."""

    # Arrange
    owner, caller = users[0], users[1]
    organization = await create_organization(owner)
    solution = await create_solution(organization)
    if role is not None:
        async with session_scope() as session:
            session.add(UserOrganization(user_id=caller.id, organization_id=organization.id, role=role))
            await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ForbiddenError, match=error):
            await solutions.delete(session, solution.id, caller.id)
