import pytest_asyncio
from httpx2 import AsyncClient
from factories import create_solution, create_organization
from sqlalchemy import select
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.tags import SolutionTag, OrganizationTag
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


@pytest_asyncio.fixture
async def organizations(users: tuple[User, User, User]) -> tuple[Organization, Organization]:
    """Persist active tenants owned by separate regular users."""

    # Arrange
    local = await create_organization(users[1], name="Local")
    foreign = await create_organization(users[2], name="Foreign")
    local.status = Status.running
    foreign.status = Status.running
    async with session_scope() as session:
        session.add_all([local, foreign])
        await session.commit()
    return local, foreign


async def test_assign_tags_rejects_mixed_tenants_without_partial_replacement(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], organizations: tuple[Organization, Organization]
) -> None:
    """Reject a foreign tag atomically and permit the valid local replacement."""

    # Arrange
    local, foreign = organizations
    solution = await create_solution(local)
    witness = await create_solution(foreign)
    solution.status = Status.running
    witness.status = Status.running
    original = OrganizationTag(organization_id=local.id, name="Original")
    replacement = OrganizationTag(organization_id=local.id, name="Replacement")
    foreign_tag = OrganizationTag(organization_id=foreign.id, name="Replacement")
    async with session_scope() as session:
        session.add_all([solution, witness, original, replacement, foreign_tag])
        await session.flush()
        session.add_all(
            [
                SolutionTag(organization_id=local.id, solution_id=solution.id, tag_id=original.id),
                SolutionTag(organization_id=foreign.id, solution_id=witness.id, tag_id=foreign_tag.id),
            ]
        )
        await session.commit()
    url = f"/api/v1/organizations/{local.id}/solutions/{solution.id}/tags"

    # Act
    response = await clients[1].patch(url, json={"tag_ids": [str(replacement.id), str(foreign_tag.id)]})

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Tag not found"}
    async with session_scope() as session:
        result = await session.scalars(select(SolutionTag))
        assert {(item.organization_id, item.solution_id, item.tag_id) for item in result.all()} == {
            (local.id, solution.id, original.id),
            (foreign.id, witness.id, foreign_tag.id),
        }
        result = await session.scalars(select(OrganizationTag))
        assert {(item.organization_id, item.id, item.name) for item in result.all()} == {
            (local.id, original.id, "Original"),
            (local.id, replacement.id, "Replacement"),
            (foreign.id, foreign_tag.id, "Replacement"),
        }

    # Act
    control = await clients[1].patch(url, json={"tag_ids": [str(replacement.id)]})

    # Assert
    assert control.status_code == 204
    assert control.content == b""
    async with session_scope() as session:
        result = await session.scalars(select(SolutionTag))
        assert {(item.organization_id, item.solution_id, item.tag_id) for item in result.all()} == {
            (local.id, solution.id, replacement.id),
            (foreign.id, witness.id, foreign_tag.id),
        }


async def test_delete_tag_removes_only_selected_tag_and_its_assignments(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], organizations: tuple[Organization, Organization]
) -> None:
    """Cascade selected assignments without deleting Solutions or unrelated tags."""

    # Arrange
    local, foreign = organizations
    first = await create_solution(local, name="First")
    second = await create_solution(local, name="Second")
    witness = await create_solution(foreign, name="Foreign")
    first.status = Status.running
    second.status = Status.running
    witness.status = Status.running
    selected = OrganizationTag(organization_id=local.id, name="Selected")
    sibling = OrganizationTag(organization_id=local.id, name="Sibling")
    foreign_tag = OrganizationTag(organization_id=foreign.id, name="Selected")
    async with session_scope() as session:
        session.add_all([first, second, witness, selected, sibling, foreign_tag])
        await session.flush()
        session.add_all(
            [
                SolutionTag(organization_id=local.id, solution_id=first.id, tag_id=selected.id),
                SolutionTag(organization_id=local.id, solution_id=second.id, tag_id=selected.id),
                SolutionTag(organization_id=local.id, solution_id=first.id, tag_id=sibling.id),
                SolutionTag(organization_id=foreign.id, solution_id=witness.id, tag_id=foreign_tag.id),
            ]
        )
        await session.commit()

    # Act
    response = await clients[1].delete(f"/api/v1/organizations/{local.id}/tags/{selected.id}")

    # Assert
    assert response.status_code == 204
    assert response.content == b""
    async with session_scope() as session:
        assert await session.get(OrganizationTag, selected.id) is None
        result = await session.scalars(select(OrganizationTag))
        assert {(item.organization_id, item.id, item.name) for item in result.all()} == {
            (local.id, sibling.id, "Sibling"),
            (foreign.id, foreign_tag.id, "Selected"),
        }
        result = await session.scalars(select(SolutionTag))
        assert {(item.organization_id, item.solution_id, item.tag_id) for item in result.all()} == {
            (local.id, first.id, sibling.id),
            (foreign.id, witness.id, foreign_tag.id),
        }
        result = await session.scalars(select(Solution))
        assert {(item.organization_id, item.id, item.name, item.status, item.deleted_at) for item in result.all()} == {
            (local.id, first.id, "First", Status.running, None),
            (local.id, second.id, "Second", Status.running, None),
            (foreign.id, witness.id, "Foreign", Status.running, None),
        }
